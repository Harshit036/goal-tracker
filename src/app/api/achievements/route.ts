import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;
  const { goalId, quarter, actualValue, actualDate, status, notes } = await req.json();

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { goalSheet: true },
  });
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  if (goal.goalSheet.employeeId !== user.id)
    return NextResponse.json({ error: "Not your goal" }, { status: 403 });

  const score = computeScore(
    goal.uomType,
    goal.target,
    actualValue !== undefined ? parseFloat(actualValue) : null,
    goal.targetDate,
    actualDate ? new Date(actualDate) : null
  );

  const achievement = await prisma.quarterlyAchievement.upsert({
    where: { goalId_quarter: { goalId, quarter } },
    create: {
      goalId,
      quarter,
      actualValue: actualValue !== undefined ? parseFloat(actualValue) : null,
      actualDate: actualDate ? new Date(actualDate) : null,
      status: status || "NOT_STARTED",
      computedScore: score,
      notes,
    },
    update: {
      actualValue: actualValue !== undefined ? parseFloat(actualValue) : null,
      actualDate: actualDate ? new Date(actualDate) : null,
      status: status || "NOT_STARTED",
      computedScore: score,
      notes,
    },
  });

  await createAuditLog({ userId: user.id, action: "ACHIEVEMENT_UPDATED", entityType: "QuarterlyAchievement", entityId: achievement.id, newValue: { quarter, actualValue, status, score } });
  return NextResponse.json(achievement);
}
