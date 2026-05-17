import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.escalationRule.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, thresholdDays, level2Days, level3Days } = await req.json();

  const VALID_TYPES = ["GOAL_NOT_SUBMITTED", "GOAL_NOT_APPROVED", "CHECKIN_NOT_COMPLETED"];
  if (!VALID_TYPES.includes(type))
    return NextResponse.json({ error: "Invalid rule type." }, { status: 400 });
  if (!name?.trim())
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (typeof thresholdDays !== "number" || thresholdDays < 1)
    return NextResponse.json({ error: "Threshold must be at least 1 day." }, { status: 400 });

  const rule = await prisma.escalationRule.create({
    data: {
      name: name.trim(),
      type,
      thresholdDays,
      level2Days: level2Days ?? 3,
      level3Days: level3Days ?? 5,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
