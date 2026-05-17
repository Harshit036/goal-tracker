import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const areas = await prisma.thrustArea.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(areas);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  const area = await prisma.thrustArea.create({ data: { name } });
  return NextResponse.json(area);
}
