import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;
  if (user.role !== "MANAGER" && user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { goalSheetId, quarter, comment } = await req.json();

  const checkIn = await prisma.checkIn.upsert({
    where: { goalSheetId_quarter: { goalSheetId, quarter } },
    create: { goalSheetId, managerId: user.id, quarter, comment },
    update: { comment, managerId: user.id },
    include: { manager: { select: { name: true } } },
  });

  await createAuditLog({ userId: user.id, action: "CHECKIN_ADDED", entityType: "CheckIn", entityId: checkIn.id, newValue: { goalSheetId, quarter, comment: comment.substring(0, 100) } });
  return NextResponse.json(checkIn);
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const goalSheetId = searchParams.get("goalSheetId");

  const checkIns = await prisma.checkIn.findMany({
    where: goalSheetId ? { goalSheetId } : {},
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(checkIns);
}
