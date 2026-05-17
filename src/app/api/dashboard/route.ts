import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });

  if (user.role === "ADMIN") {
    const [totalUsers, totalSheets, approvedSheets, pendingSheets] = await Promise.all([
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.goalSheet.count({ where: cycle ? { cycleId: cycle.id } : {} }),
      prisma.goalSheet.count({ where: { status: "APPROVED", ...(cycle ? { cycleId: cycle.id } : {}) } }),
      prisma.goalSheet.count({ where: { status: "SUBMITTED", ...(cycle ? { cycleId: cycle.id } : {}) } }),
    ]);
    return NextResponse.json({ totalUsers, totalSheets, approvedSheets, pendingSheets, cycle });
  }

  if (user.role === "MANAGER") {
    const reports = await prisma.user.findMany({ where: { managerId: user.id } });
    const reportIds = reports.map((r: any) => r.id);
    const teamSheets = await prisma.goalSheet.findMany({
      where: { employeeId: { in: reportIds }, ...(cycle ? { cycleId: cycle.id } : {}) },
      include: { employee: { select: { name: true } } },
    });
    const mySheet = await prisma.goalSheet.findFirst({
      where: { employeeId: user.id, ...(cycle ? { cycleId: cycle.id } : {}) },
      include: { goals: { include: { achievements: true } } },
    });
    return NextResponse.json({ teamSheets, mySheet, reports: reports.length, cycle });
  }

  // Employee
  const mySheet = await prisma.goalSheet.findFirst({
    where: { employeeId: user.id, ...(cycle ? { cycleId: cycle.id } : {}) },
    include: { goals: { include: { achievements: true, thrustArea: true } } },
  });
  return NextResponse.json({ mySheet, cycle });
}
