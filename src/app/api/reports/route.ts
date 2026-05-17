import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  const type = searchParams.get("type") || "achievement";

  if (type === "audit") {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return NextResponse.json(logs);
  }

  if (type === "completion") {
    const cycleWhere = cycleId ? { cycleId } : {};
    const sheets = await prisma.goalSheet.findMany({
      where: cycleWhere,
      include: {
        employee: { select: { name: true, email: true, department: true } },
        cycle: { select: { name: true } },
        goals: { include: { achievements: true } },
        checkIns: true,
      },
    });
    return NextResponse.json(sheets);
  }

  // Achievement report
  const cycleWhere = cycleId ? { cycleId } : {};
  const sheets = await prisma.goalSheet.findMany({
    where: { status: "APPROVED", ...cycleWhere },
    include: {
      employee: { select: { name: true, email: true, department: true } },
      cycle: { select: { name: true } },
      goals: {
        include: {
          thrustArea: true,
          achievements: { orderBy: { quarter: "asc" } },
        },
      },
    },
  });

  return NextResponse.json(sheets);
}
