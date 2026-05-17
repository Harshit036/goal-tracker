import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: any = {};
  if (body.name !== undefined)          data.name          = body.name.trim();
  if (body.thresholdDays !== undefined) data.thresholdDays = body.thresholdDays;
  if (body.level2Days !== undefined)    data.level2Days    = body.level2Days;
  if (body.level3Days !== undefined)    data.level3Days    = body.level3Days;
  if (body.isActive !== undefined)      data.isActive      = body.isActive;

  try {
    const rule = await prisma.escalationRule.update({ where: { id }, data });
    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.escalationRule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  }
}
