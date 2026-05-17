import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cycles = await prisma.goalCycle.findMany({ orderBy: { year: "asc" } });

  // Completion rates per cycle
  const completionByCycle = await Promise.all(
    cycles.map(async (cycle) => {
      const total = await prisma.goalSheet.count({ where: { cycleId: cycle.id } });
      const approved = await prisma.goalSheet.count({ where: { cycleId: cycle.id, status: "APPROVED" } });
      return { cycle: cycle.name, year: cycle.year, total, approved, rate: total > 0 ? Math.round((approved / total) * 100) : 0 };
    })
  );

  // Goal distribution by thrust area (active cycle)
  const activeCycle = cycles.find((c) => c.isActive) || cycles[cycles.length - 1];
  let thrustDistribution: any[] = [];
  let statusDistribution: any[] = [];
  let quarterlyScores: any[] = [];
  let departmentCompletion: any[] = [];

  if (activeCycle) {
    const goals = await prisma.goal.findMany({
      where: { goalSheet: { cycleId: activeCycle.id } },
      include: { thrustArea: true, achievements: true },
    });

    // Thrust area distribution
    const thrustMap: Record<string, number> = {};
    goals.forEach((g) => {
      thrustMap[g.thrustArea.name] = (thrustMap[g.thrustArea.name] || 0) + 1;
    });
    thrustDistribution = Object.entries(thrustMap).map(([name, count]) => ({ name, count }));

    // Status distribution
    const statusMap: Record<string, number> = { NOT_STARTED: 0, ON_TRACK: 0, COMPLETED: 0 };
    goals.forEach((g) => {
      g.achievements.forEach((a) => {
        statusMap[a.status] = (statusMap[a.status] || 0) + 1;
      });
    });
    statusDistribution = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    // Quarterly average scores
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    quarterlyScores = quarters.map((q) => {
      const qAchievements = goals.flatMap((g) => g.achievements.filter((a) => a.quarter === q && a.computedScore !== null));
      const avg = qAchievements.length > 0 ? qAchievements.reduce((s, a) => s + (a.computedScore || 0), 0) / qAchievements.length : 0;
      return { quarter: q, avgScore: Math.round(avg * 10) / 10, count: qAchievements.length };
    });

    // Department completion
    const sheets = await prisma.goalSheet.findMany({
      where: { cycleId: activeCycle.id },
      include: { employee: { select: { department: true } } },
    });
    const deptMap: Record<string, { total: number; approved: number }> = {};
    sheets.forEach((s) => {
      const dept = s.employee.department || "Unknown";
      if (!deptMap[dept]) deptMap[dept] = { total: 0, approved: 0 };
      deptMap[dept].total++;
      if (s.status === "APPROVED") deptMap[dept].approved++;
    });
    departmentCompletion = Object.entries(deptMap).map(([dept, data]) => ({
      dept,
      total: data.total,
      approved: data.approved,
      rate: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0,
    }));
  }

  return NextResponse.json({
    completionByCycle,
    thrustDistribution,
    statusDistribution,
    quarterlyScores,
    departmentCompletion,
    activeCycle,
  });
}
