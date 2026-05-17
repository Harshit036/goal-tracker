import { prisma } from "./prisma";

export async function syncCycleStatus(cycleId: string): Promise<void> {
  const cycle = await prisma.goalCycle.findUnique({
    where: { id: cycleId },
    include: { windows: { orderBy: { opensAt: "asc" } } },
  });
  if (!cycle) return;

  const now = new Date();
  const gw = cycle.windows.find((w) => w.phase === "GOAL_SETTING");
  const fw = cycle.windows.find((w) => w.phase === "Q4_ANNUAL");

  let newStatus = cycle.status;
  let newIsActive = cycle.isActive;

  if (gw && now >= gw.opensAt && now <= gw.closesAt) {
    newStatus = "GOAL_SETTING";
    newIsActive = true;
  } else if (gw && now > gw.closesAt && fw && now <= fw.closesAt) {
    newStatus = "ACTIVE";
    newIsActive = true;
  } else if (fw && now > fw.closesAt) {
    newStatus = "CLOSED";
    newIsActive = false;
  }

  if (newStatus !== cycle.status || newIsActive !== cycle.isActive) {
    await prisma.goalCycle.update({
      where: { id: cycleId },
      data: { status: newStatus, isActive: newIsActive },
    });
  }

  // Keep window isOpen flags in sync with current date
  for (const w of cycle.windows) {
    const shouldBeOpen = now >= w.opensAt && now <= w.closesAt;
    if (shouldBeOpen !== w.isOpen) {
      await prisma.cycleWindow.update({ where: { id: w.id }, data: { isOpen: shouldBeOpen } });
    }
  }
}

// Sync all cycles that have windows (regardless of isActive, to close stale ones)
export async function syncAllCycles(): Promise<void> {
  const cycles = await prisma.goalCycle.findMany({
    where: { status: { not: "CLOSED" } },
    select: { id: true },
  });
  await Promise.all(cycles.map((c) => syncCycleStatus(c.id)));
}
