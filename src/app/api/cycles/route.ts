import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cycles = await prisma.goalCycle.findMany({
    include: { windows: true },
    orderBy: { year: "desc" },
  });
  return NextResponse.json(cycles);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;
  const { name, year, isActive } = await req.json();

  if (isActive) {
    await prisma.goalCycle.updateMany({ data: { isActive: false } });
  }

  const cycle = await prisma.goalCycle.create({
    data: {
      name,
      year: parseInt(year),
      isActive: isActive || false,
      windows: {
        create: [
          { phase: "GOAL_SETTING", opensAt: new Date(`${year}-05-01`), closesAt: new Date(`${year}-06-30`), isOpen: true },
          { phase: "Q1_CHECKIN", opensAt: new Date(`${year}-07-01`), closesAt: new Date(`${year}-07-31`), isOpen: false },
          { phase: "Q2_CHECKIN", opensAt: new Date(`${year}-10-01`), closesAt: new Date(`${year}-10-31`), isOpen: false },
          { phase: "Q3_CHECKIN", opensAt: new Date(`${parseInt(year)+1}-01-01`), closesAt: new Date(`${parseInt(year)+1}-01-31`), isOpen: false },
          { phase: "Q4_ANNUAL", opensAt: new Date(`${parseInt(year)+1}-03-01`), closesAt: new Date(`${parseInt(year)+1}-04-30`), isOpen: false },
        ],
      },
    },
    include: { windows: true },
  });

  await createAuditLog({ userId: user.id, action: "CYCLE_UPDATED", entityType: "GoalCycle", entityId: cycle.id, newValue: { name, year, isActive } });
  return NextResponse.json(cycle, { status: 201 });
}
