// Server-only: imports prisma. Do NOT import into client components.
import { prisma } from "@/lib/prisma";
import { CyclePhase, PHASE_CONFIG } from "./cycle.constants";

// SRP: this module's sole responsibility is cycle phase state transitions.

// State machine: moves a cycle to the target phase.
// Handles window isOpen flags and cycle status/isActive atomically.
export async function transitionPhase(
  cycleId: string,
  targetPhase: CyclePhase
): Promise<void> {
  const { cycleStatus } = PHASE_CONFIG[targetPhase];
  const isClosing = targetPhase === "CLOSED";

  // Step 1: close all windows
  await prisma.cycleWindow.updateMany({
    where: { cycleId },
    data: { isOpen: false },
  });

  // Step 2: open the target window (CLOSED has no corresponding window)
  if (!isClosing) {
    const window = await prisma.cycleWindow.findFirst({
      where: { cycleId, phase: targetPhase },
    });
    if (window) {
      await prisma.cycleWindow.update({
        where: { id: window.id },
        data: { isOpen: true },
      });
    }
  }

  // Step 3: update cycle-level status
  await prisma.goalCycle.update({
    where: { id: cycleId },
    data: { status: cycleStatus, isActive: !isClosing },
  });
}
