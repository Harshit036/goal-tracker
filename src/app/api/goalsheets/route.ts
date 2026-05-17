import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });

  const sheet = await prisma.goalSheet.findFirst({
    where: { employeeId: user.id, ...(cycle ? { cycleId: cycle.id } : {}) },
    include: {
      goals: {
        include: {
          thrustArea: true,
          achievements: { orderBy: { quarter: "asc" } },
          sharedFrom: { include: { sourceGoal: { include: { goalSheet: { include: { employee: { select: { name: true } } } } } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      cycle: true,
    },
  });

  return NextResponse.json(sheet);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });
  if (!cycle) return NextResponse.json({ error: "No active cycle found." }, { status: 400 });

  const existing = await prisma.goalSheet.findFirst({
    where: { employeeId: user.id, cycleId: cycle.id },
  });
  if (existing) return NextResponse.json(existing);

  const sheet = await prisma.goalSheet.create({
    data: { employeeId: user.id, cycleId: cycle.id, status: "DRAFT" },
  });

  await createAuditLog({ userId: user.id, action: "GOAL_CREATED", entityType: "GoalSheet", entityId: sheet.id, newValue: { status: "DRAFT" } });
  return NextResponse.json(sheet, { status: 201 });
}
