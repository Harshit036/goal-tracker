import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session as any;
    const { id } = await params;
    const body = await req.json();

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: { goalSheet: true },
    });
    if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (user.role === "EMPLOYEE") {
      if (goal.goalSheet.employeeId !== user.id)
        return NextResponse.json({ error: "Not your goal" }, { status: 403 });
      if (goal.isLocked)
        return NextResponse.json({ error: "Goal is locked after approval." }, { status: 400 });
      if (goal.isShared) {
        const updated = await prisma.goal.update({ where: { id }, data: { weightage: parseInt(body.weightage) } });
        return NextResponse.json(updated);
      }
    }

    const updateData: any = {};
    if (body.target !== undefined) updateData.target = parseFloat(body.target);
    if (body.weightage !== undefined) updateData.weightage = parseInt(body.weightage);
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.targetDate !== undefined) updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null;

    const old = { target: goal.target, weightage: goal.weightage };
    const updated = await prisma.goal.update({ where: { id }, data: updateData });
    await createAuditLog({ userId: user.id, action: "GOAL_UPDATED", entityType: "Goal", entityId: id, oldValue: old, newValue: updateData });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/goals/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to update goal." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session as any;
    const { id } = await params;

    const goal = await prisma.goal.findUnique({ where: { id }, include: { goalSheet: true } });
    if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (goal.goalSheet.employeeId !== user.id)
      return NextResponse.json({ error: "Not your goal" }, { status: 403 });
    if (goal.isLocked)
      return NextResponse.json({ error: "Cannot delete locked goal." }, { status: 400 });
    if (goal.goalSheet.status === "APPROVED")
      return NextResponse.json({ error: "Sheet is approved." }, { status: 400 });

    await prisma.goal.delete({ where: { id } });
    await createAuditLog({ userId: user.id, action: "GOAL_DELETED", entityType: "Goal", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/goals/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete goal." }, { status: 500 });
  }
}
