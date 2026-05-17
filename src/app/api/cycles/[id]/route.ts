import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CYCLE_PHASES, CyclePhase } from "@/lib/services/cycle.constants";
import { transitionPhase } from "@/lib/services/cycle.service";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Phase transition — primary path via CycleService state machine
  if (body.phase !== undefined) {
    if (!CYCLE_PHASES.includes(body.phase)) {
      return NextResponse.json({ error: "Invalid phase." }, { status: 400 });
    }
    try {
      await transitionPhase(id, body.phase as CyclePhase);
      const cycle = await prisma.goalCycle.findUnique({
        where: { id },
        include: { windows: true },
      });
      return NextResponse.json(cycle);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to transition phase" }, { status: 500 });
    }
  }

  // Rename only
  if (body.name !== undefined) {
    try {
      const cycle = await prisma.goalCycle.update({
        where: { id },
        data: { name: body.name },
        include: { windows: true },
      });
      return NextResponse.json(cycle);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to update cycle" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const sheetCount = await prisma.goalSheet.count({ where: { cycleId: id } });
    if (sheetCount > 0)
      return NextResponse.json(
        { error: `Cannot delete: ${sheetCount} goal sheet(s) reference this cycle.` },
        { status: 400 }
      );

    await prisma.cycleWindow.deleteMany({ where: { cycleId: id } });
    await prisma.goalCycle.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete cycle" }, { status: 500 });
  }
}
