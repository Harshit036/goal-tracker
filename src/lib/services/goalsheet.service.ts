// Server-only: imports prisma. Do NOT import into client components.
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// SRP: this module's sole responsibility is goal-sheet review operations.

// LSP / ISP: both MANAGER and ADMIN fully satisfy the reviewer contract.
// Use this predicate everywhere instead of ad-hoc role string checks.
export function canReviewGoalSheets(role: string): boolean {
  return role === "MANAGER" || role === "ADMIN";
}

// Fetches the reviewer's direct reports' sheets for the active cycle.
// Admin-as-manager sees their own direct reports, not the entire org.
export async function getTeamSheets(reviewerId: string) {
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });

  const reports = await prisma.user.findMany({
    where: { managerId: reviewerId },
    select: { id: true, name: true, email: true, department: true },
  });

  const sheets = await prisma.goalSheet.findMany({
    where: {
      employeeId: { in: reports.map((r) => r.id) },
      ...(cycle ? { cycleId: cycle.id } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, email: true, department: true } },
      goals: {
        include: {
          thrustArea: true,
          achievements: { orderBy: { quarter: "asc" } },
        },
      },
      checkIns: { include: { manager: { select: { name: true } } } },
    },
  });

  return { sheets, cycle, totalReports: reports.length };
}

export async function approveGoalSheet(sheetId: string, reviewerId: string) {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    select: { status: true },
  });
  if (!sheet) throw new Error("Sheet not found");
  if (sheet.status !== "SUBMITTED")
    throw new Error("Only SUBMITTED sheets can be approved");

  const updated = await prisma.goalSheet.update({
    where: { id: sheetId },
    data: { status: "APPROVED", managerNote: null },
  });
  await prisma.goal.updateMany({
    where: { goalSheetId: sheetId },
    data: { isLocked: true },
  });
  await createAuditLog({
    userId: reviewerId,
    action: "GOAL_APPROVED",
    entityType: "GoalSheet",
    entityId: sheetId,
    oldValue: { status: sheet.status },
    newValue: { status: "APPROVED" },
  });
  return updated;
}

export async function returnGoalSheetForRework(
  sheetId: string,
  reviewerId: string,
  note: string | null
) {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    select: { status: true },
  });
  if (!sheet) throw new Error("Sheet not found");
  if (sheet.status !== "SUBMITTED")
    throw new Error("Only SUBMITTED sheets can be returned for rework");

  const updated = await prisma.goalSheet.update({
    where: { id: sheetId },
    data: { status: "REWORK", managerNote: note || null },
  });
  await createAuditLog({
    userId: reviewerId,
    action: "GOAL_RETURNED",
    entityType: "GoalSheet",
    entityId: sheetId,
    oldValue: { status: sheet.status },
    newValue: { status: "REWORK", managerNote: note },
  });
  return updated;
}

export async function unlockGoalSheet(sheetId: string, adminId: string) {
  await prisma.goal.updateMany({
    where: { goalSheetId: sheetId },
    data: { isLocked: false },
  });
  const updated = await prisma.goalSheet.update({
    where: { id: sheetId },
    data: { status: "DRAFT" },
  });
  await createAuditLog({
    userId: adminId,
    action: "GOAL_UNLOCKED",
    entityType: "GoalSheet",
    entityId: sheetId,
    newValue: { unlockedBy: adminId },
  });
  return updated;
}
