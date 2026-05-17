import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session as any;
    if (user.role !== "ADMIN")
      return NextResponse.json({ error: "Only admins can push shared goals." }, { status: 403 });

    const { title, thrustAreaId, uomType, target, targetDate, weightage, targetEmployeeIds } = await req.json();

    if (!title || !thrustAreaId || !uomType || !weightage || !targetEmployeeIds?.length)
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });

    const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });
    if (!cycle) return NextResponse.json({ error: "No active cycle found." }, { status: 400 });

    const parsedTarget = uomType === "TIMELINE" ? 0 : parseFloat(target);
    const parsedWeight = parseInt(weightage);

    // Find or create admin's goal sheet for this cycle (used as source)
    let adminSheet = await prisma.goalSheet.findFirst({
      where: { employeeId: user.id, cycleId: cycle.id },
    });
    if (!adminSheet) {
      adminSheet = await prisma.goalSheet.create({
        data: { employeeId: user.id, cycleId: cycle.id, status: "DRAFT" },
      });
    }

    // Create source goal on admin's sheet
    const sourceGoal = await prisma.goal.create({
      data: {
        goalSheetId: adminSheet.id,
        thrustAreaId,
        title,
        uomType,
        target: parsedTarget,
        targetDate: targetDate ? new Date(targetDate) : null,
        weightage: parsedWeight,
        isShared: true,
      },
    });

    // Create SharedGoal record
    const sharedGoalRecord = await prisma.sharedGoal.create({
      data: { sourceGoalId: sourceGoal.id, pushedBy: user.id },
    });

    // Push to each target employee
    const results: any[] = [];
    const skipped: string[] = [];

    for (const empId of targetEmployeeIds) {
      let sheet = await prisma.goalSheet.findFirst({ where: { employeeId: empId, cycleId: cycle.id } });
      if (!sheet) {
        sheet = await prisma.goalSheet.create({ data: { employeeId: empId, cycleId: cycle.id, status: "DRAFT" } });
      }

      if (sheet.status === "APPROVED") { skipped.push(empId); continue; }

      const existingCount = await prisma.goal.count({ where: { goalSheetId: sheet.id } });
      if (existingCount >= 8) { skipped.push(empId); continue; }

      // Check if already pushed to this employee
      const alreadyPushed = await prisma.goal.findFirst({
        where: { goalSheetId: sheet.id, sharedFromId: sharedGoalRecord.id },
      });
      if (alreadyPushed) { skipped.push(empId); continue; }

      const pushed = await prisma.goal.create({
        data: {
          goalSheetId: sheet.id,
          thrustAreaId,
          title,
          uomType,
          target: parsedTarget,
          targetDate: targetDate ? new Date(targetDate) : null,
          weightage: parsedWeight,
          isShared: true,
          isLocked: false,
          sharedFromId: sharedGoalRecord.id,
        },
      });
      results.push(pushed);
    }

    await createAuditLog({
      userId: user.id,
      action: "SHARED_GOAL_PUSHED",
      entityType: "SharedGoal",
      entityId: sharedGoalRecord.id,
      newValue: { title, targetEmployeeIds, pushed: results.length, skipped: skipped.length },
    });

    return NextResponse.json({ pushed: results.length, skipped: skipped.length, results });
  } catch (err: any) {
    console.error("POST /api/shared-goals error:", err);
    return NextResponse.json({ error: err.message || "Failed to push goal." }, { status: 500 });
  }
}
