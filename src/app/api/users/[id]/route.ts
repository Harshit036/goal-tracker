import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Hierarchy validation: employees must have a manager
  if (body.role === "EMPLOYEE" && !body.managerId) {
    return NextResponse.json({ error: "Employees must be assigned a manager." }, { status: 400 });
  }

  // Cyclic dependency check
  if (body.managerId) {
    const hasCycle = await detectCycle(id, body.managerId);
    if (hasCycle) {
      return NextResponse.json({ error: "This creates a circular reporting hierarchy." }, { status: 400 });
    }
  }

  try {
    const updateData: any = {
      name: body.name,
      role: body.role,
      department: body.department || null,
      managerId: body.managerId || null,
    };

    if (body.password && body.password.trim()) {
      updateData.password = await bcrypt.hash(body.password.trim(), 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { manager: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ ...user, password: undefined });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = session as any;
  const { id } = await params;

  // Prevent self-deletion
  if (actor.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Last-admin guard: the org must always have at least one admin
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin. Promote another user to admin first." },
        { status: 400 }
      );
    }
  }

  try {
    // Write audit log while the user record still exists (actorName snapshot captured here).
    await createAuditLog({
      userId: actor.id,
      action: "USER_DELETED",
      entityType: "User",
      entityId: id,
      newValue: { deletedName: target.name, deletedRole: target.role },
    });

    await deleteUserData(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}

// Explicit deletion order — never rely on DB cascade ordering for multi-step chains.
async function deleteUserData(userId: string): Promise<void> {
  // 1. Collect the user's goal sheet and goal IDs.
  const sheets = await prisma.goalSheet.findMany({
    where: { employeeId: userId },
    select: { id: true },
  });
  const sheetIds = sheets.map((s) => s.id);

  const goals = await prisma.goal.findMany({
    where: { goalSheetId: { in: sheetIds } },
    select: { id: true },
  });
  const goalIds = goals.map((g) => g.id);

  // 2. Unlink any SharedGoal records whose SOURCE goal belongs to this user.
  //    (Admin assigned their own goal as the template; deleting the admin removes those links.)
  //    First null-out sharedFromId on every target goal that points to these SharedGoals,
  //    then delete the SharedGoal records.
  if (goalIds.length > 0) {
    const srcSharedGoals = await prisma.sharedGoal.findMany({
      where: { sourceGoalId: { in: goalIds } },
      select: { id: true },
    });
    if (srcSharedGoals.length > 0) {
      await prisma.goal.updateMany({
        where: { sharedFromId: { in: srcSharedGoals.map((sg) => sg.id) } },
        data: { sharedFromId: null },
      });
      await prisma.sharedGoal.deleteMany({ where: { sourceGoalId: { in: goalIds } } });
    }
  }

  // 3. Remove SharedGoal records PUSHED BY this user (admin pushed goals to others).
  //    Null-out sharedFromId on every employee goal that was assigned via these links.
  const pushedLinks = await prisma.sharedGoal.findMany({
    where: { pushedBy: userId },
    select: { id: true },
  });
  if (pushedLinks.length > 0) {
    await prisma.goal.updateMany({
      where: { sharedFromId: { in: pushedLinks.map((sg) => sg.id) } },
      data: { sharedFromId: null },
    });
    await prisma.sharedGoal.deleteMany({ where: { pushedBy: userId } });
  }

  // 4. Delete quarterly achievements for user's goals.
  if (goalIds.length > 0) {
    await prisma.quarterlyAchievement.deleteMany({ where: { goalId: { in: goalIds } } });
  }

  // 5. Delete goals.
  if (goalIds.length > 0) {
    await prisma.goal.deleteMany({ where: { goalSheetId: { in: sheetIds } } });
  }

  // 6. Delete check-ins on user's goal sheets (logged by managers about this user).
  if (sheetIds.length > 0) {
    await prisma.checkIn.deleteMany({ where: { goalSheetId: { in: sheetIds } } });
  }

  // 7. Delete the goal sheets themselves.
  if (sheetIds.length > 0) {
    await prisma.goalSheet.deleteMany({ where: { employeeId: userId } });
  }

  // 8. Delete check-ins written BY this user as a manager.
  await prisma.checkIn.deleteMany({ where: { managerId: userId } });

  // 9. Unassign direct reports (set their managerId to null, do not delete them).
  await prisma.user.updateMany({ where: { managerId: userId }, data: { managerId: null } });

  // 10. Delete notifications and escalation events for this user.
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.escalationEvent.deleteMany({ where: { subjectId: userId } });

  // 11. Delete the user — AuditLog.userId becomes null via DB-level SetNull.
  await prisma.user.delete({ where: { id: userId } });
}

async function detectCycle(userId: string, newManagerId: string): Promise<boolean> {
  const visited = new Set<string>();
  let current: string | null = newManagerId;
  while (current) {
    if (current === userId) return true;
    if (visited.has(current)) break;
    visited.add(current);
    const u: { managerId: string | null } | null = await prisma.user.findUnique({
      where: { id: current },
      select: { managerId: true },
    });
    current = u?.managerId ?? null;
  }
  return false;
}
