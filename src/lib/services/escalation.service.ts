import { prisma } from "@/lib/prisma";

export type EscalationRuleType =
  | "GOAL_NOT_SUBMITTED"
  | "GOAL_NOT_APPROVED"
  | "CHECKIN_NOT_COMPLETED";

export const RULE_TYPE_LABELS: Record<EscalationRuleType, string> = {
  GOAL_NOT_SUBMITTED:    "Goals Not Submitted",
  GOAL_NOT_APPROVED:     "Goals Not Approved",
  CHECKIN_NOT_COMPLETED: "Check-in Not Completed",
};

export const RULE_TYPE_DESCRIPTIONS: Record<EscalationRuleType, string> = {
  GOAL_NOT_SUBMITTED:    "Employee has not submitted their goal sheet within N days of the Goal Setting window opening.",
  GOAL_NOT_APPROVED:     "Manager has not approved a submitted goal sheet within N days.",
  CHECKIN_NOT_COMPLETED: "Manager has not completed a quarterly check-in within N days of the check-in window opening.",
};

const PHASE_TO_QUARTER: Record<string, string> = {
  Q1_CHECKIN: "Q1",
  Q2_CHECKIN: "Q2",
  Q3_CHECKIN: "Q3",
  Q4_ANNUAL:  "Q4",
};

interface RuleRow {
  id: string;
  type: string;
  name: string;
  thresholdDays: number;
  level2Days: number;
  level3Days: number;
}

interface RunStats { eventsCreated: number; escalated: number; resolved: number }

function daysAgo(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function computeLevel(days: number, rule: RuleRow): number | null {
  if (days < rule.thresholdDays) return null;
  if (days >= rule.thresholdDays + rule.level2Days + rule.level3Days) return 3;
  if (days >= rule.thresholdDays + rule.level2Days) return 2;
  return 1;
}

async function adminId(): Promise<string | null> {
  const a = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  return a?.id ?? null;
}

async function notify(userId: string, eventId: string, title: string, body: string, level: number) {
  const existing = await prisma.notification.findFirst({ where: { userId, eventId, level } });
  if (existing) return;
  await prisma.notification.create({ data: { userId, eventId, title, body, level } });
}

async function upsertEvent(params: {
  ruleId: string; subjectId: string; contextId: string; contextType: string; level: number;
}): Promise<{ id: string; isNew: boolean; levelChanged: boolean }> {
  const existing = await prisma.escalationEvent.findUnique({
    where: { ruleId_subjectId_contextId: { ruleId: params.ruleId, subjectId: params.subjectId, contextId: params.contextId } },
  });

  if (!existing) {
    const ev = await prisma.escalationEvent.create({
      data: { ruleId: params.ruleId, subjectId: params.subjectId, contextId: params.contextId, contextType: params.contextType, currentLevel: params.level, status: "OPEN" },
    });
    return { id: ev.id, isNew: true, levelChanged: false };
  }

  if (existing.status === "RESOLVED") {
    await prisma.escalationEvent.update({ where: { id: existing.id }, data: { status: "OPEN", currentLevel: params.level, resolvedAt: null } });
    return { id: existing.id, isNew: true, levelChanged: false };
  }

  const levelChanged = existing.currentLevel < params.level;
  if (levelChanged) {
    await prisma.escalationEvent.update({ where: { id: existing.id }, data: { currentLevel: params.level, updatedAt: new Date() } });
  }
  return { id: existing.id, isNew: false, levelChanged };
}

async function resolveEvents(ruleId: string, activeContextIds: Set<string>): Promise<number> {
  const openEvents = await prisma.escalationEvent.findMany({ where: { ruleId, status: "OPEN" }, select: { id: true, contextId: true } });
  let count = 0;
  for (const ev of openEvents) {
    if (!activeContextIds.has(ev.contextId)) {
      await prisma.escalationEvent.update({ where: { id: ev.id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
      count++;
    }
  }
  return count;
}

// ── Rule: GOAL_NOT_SUBMITTED ──────────────────────────────────────────────────
async function processGoalNotSubmitted(rule: RuleRow, activeCycle: any): Promise<RunStats> {
  const stats: RunStats = { eventsCreated: 0, escalated: 0, resolved: 0 };
  if (!activeCycle) return stats;

  const gsWindow = activeCycle.windows.find((w: any) => w.phase === "GOAL_SETTING" && w.isOpen);
  if (!gsWindow) return stats;

  const daysSinceOpen = daysAgo(gsWindow.opensAt);

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, name: true, managerId: true },
  });

  const sheets = await prisma.goalSheet.findMany({
    where: { cycleId: activeCycle.id },
    select: { employeeId: true, id: true, status: true },
  });

  const sheetByEmployee = new Map(sheets.map((s) => [s.employeeId, s]));
  const submittedIds = new Set(sheets.filter((s) => ["SUBMITTED", "APPROVED"].includes(s.status)).map((s) => s.employeeId));

  // Build active violation keys so we can resolve no-longer-violated events
  const activeKeys = new Set<string>();
  for (const emp of employees) {
    if (submittedIds.has(emp.id)) continue;
    const level = computeLevel(daysSinceOpen, rule);
    if (level === null) continue;
    const sheet = sheetByEmployee.get(emp.id);
    const contextId = sheet ? sheet.id : `cycle-${activeCycle.id}-emp-${emp.id}`;
    activeKeys.add(contextId);
  }

  stats.resolved += await resolveEvents(rule.id, activeKeys);

  for (const emp of employees) {
    if (submittedIds.has(emp.id)) continue;
    const level = computeLevel(daysSinceOpen, rule);
    if (level === null) continue;

    const sheet = sheetByEmployee.get(emp.id);
    const contextId = sheet ? sheet.id : `cycle-${activeCycle.id}-emp-${emp.id}`;

    const { id: eventId, isNew, levelChanged } = await upsertEvent({ ruleId: rule.id, subjectId: emp.id, contextId, contextType: "GoalSheet", level });
    if (isNew) stats.eventsCreated++;
    if (levelChanged) stats.escalated++;

    if (isNew || levelChanged) {
      if (level >= 1) {
        await notify(emp.id, eventId, "Goals Not Submitted", `Your goal sheet for ${activeCycle.name} is overdue. Please submit your goals as soon as possible.`, 1);
      }
      if (level >= 2 && emp.managerId) {
        await notify(emp.managerId, eventId, "Team Member's Goals Overdue", `${emp.name}'s goal sheet for ${activeCycle.name} has not been submitted (${daysSinceOpen}d). Please follow up with them.`, 2);
      }
      if (level >= 3) {
        const aid = await adminId();
        if (aid) await notify(aid, eventId, "Unsubmitted Goals — HR Action Required", `${emp.name}'s goals for ${activeCycle.name} remain unsubmitted after ${daysSinceOpen} days. Escalated for HR review.`, 3);
      }
    }
  }
  return stats;
}

// ── Rule: GOAL_NOT_APPROVED ───────────────────────────────────────────────────
async function processGoalNotApproved(rule: RuleRow, activeCycle: any): Promise<RunStats> {
  const stats: RunStats = { eventsCreated: 0, escalated: 0, resolved: 0 };

  const submittedSheets = await prisma.goalSheet.findMany({
    where: { status: "SUBMITTED" },
    include: {
      employee: {
        select: { id: true, name: true, managerId: true, manager: { select: { id: true, managerId: true } } },
      },
      cycle: { select: { name: true } },
    },
  });

  const activeKeys = new Set(submittedSheets.map((s) => s.id));
  stats.resolved += await resolveEvents(rule.id, activeKeys);

  for (const sheet of submittedSheets) {
    const daysPending = daysAgo(sheet.updatedAt);
    const level = computeLevel(daysPending, rule);
    if (level === null) continue;

    const managerId = sheet.employee.managerId;
    if (!managerId) continue;

    const { id: eventId, isNew, levelChanged } = await upsertEvent({ ruleId: rule.id, subjectId: managerId, contextId: sheet.id, contextType: "GoalSheet", level });
    if (isNew) stats.eventsCreated++;
    if (levelChanged) stats.escalated++;

    if (isNew || levelChanged) {
      if (level >= 1) {
        await notify(managerId, eventId, "Goal Approval Overdue", `${sheet.employee.name}'s goal sheet has been waiting for your approval for ${daysPending} day(s). Please review and approve.`, 1);
      }
      if (level >= 2) {
        const skipId = sheet.employee.manager?.managerId ?? await adminId();
        if (skipId) await notify(skipId, eventId, "Approval Delay Escalated", `${sheet.employee.name}'s goal sheet (${sheet.cycle.name}) is pending approval and hasn't been actioned in ${daysPending} days.`, 2);
      }
      if (level >= 3) {
        const aid = await adminId();
        if (aid) await notify(aid, eventId, "Critical: Goal Sheet Still Unapproved", `${sheet.employee.name}'s goals for ${sheet.cycle.name} remain unapproved after ${daysPending} days. Immediate attention required.`, 3);
      }
    }
  }
  return stats;
}

// ── Rule: CHECKIN_NOT_COMPLETED ───────────────────────────────────────────────
async function processCheckinNotCompleted(rule: RuleRow, activeCycle: any): Promise<RunStats> {
  const stats: RunStats = { eventsCreated: 0, escalated: 0, resolved: 0 };
  if (!activeCycle) return stats;

  const checkinWindow = activeCycle.windows.find((w: any) => w.isOpen && PHASE_TO_QUARTER[w.phase]);
  if (!checkinWindow) return stats;

  const currentQuarter = PHASE_TO_QUARTER[checkinWindow.phase];
  const daysSinceOpen  = daysAgo(checkinWindow.opensAt);
  const level          = computeLevel(daysSinceOpen, rule);
  if (level === null) return stats;

  const approvedSheets = await prisma.goalSheet.findMany({
    where: { status: "APPROVED", cycleId: activeCycle.id },
    include: {
      employee: { select: { id: true, name: true, managerId: true, manager: { select: { id: true, managerId: true } } } },
      checkIns: { where: { quarter: currentQuarter }, select: { id: true } },
    },
  });

  const overdueSheets = approvedSheets.filter((s) => s.checkIns.length === 0);
  const activeKeys    = new Set(overdueSheets.map((s) => `${s.id}:${currentQuarter}`));
  stats.resolved     += await resolveEvents(rule.id, activeKeys);

  for (const sheet of overdueSheets) {
    const managerId = sheet.employee.managerId;
    if (!managerId) continue;

    const { id: eventId, isNew, levelChanged } = await upsertEvent({ ruleId: rule.id, subjectId: managerId, contextId: `${sheet.id}:${currentQuarter}`, contextType: "GoalSheet", level });
    if (isNew) stats.eventsCreated++;
    if (levelChanged) stats.escalated++;

    if (isNew || levelChanged) {
      if (level >= 1) {
        await notify(managerId, eventId, `${currentQuarter} Check-in Overdue`, `You have not completed the ${currentQuarter} check-in for ${sheet.employee.name}. Please record it before the window closes.`, 1);
      }
      if (level >= 2) {
        const skipId = sheet.employee.manager?.managerId ?? await adminId();
        if (skipId && skipId !== managerId) await notify(skipId, eventId, "Check-in Delay Escalated", `${sheet.employee.name}'s ${currentQuarter} check-in has not been completed by their manager (${daysSinceOpen}d overdue).`, 2);
      }
      if (level >= 3) {
        const aid = await adminId();
        if (aid) await notify(aid, eventId, "Overdue Check-ins — HR Alert", `${sheet.employee.name}'s ${currentQuarter} check-in remains incomplete after ${daysSinceOpen} days. Escalated for HR review.`, 3);
      }
    }
  }
  return stats;
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function runEscalationCheck(): Promise<RunStats> {
  const rules = await prisma.escalationRule.findMany({ where: { isActive: true } });

  const activeCycle = await prisma.goalCycle.findFirst({
    where: { isActive: true },
    include: { windows: true },
  });

  const totals: RunStats = { eventsCreated: 0, escalated: 0, resolved: 0 };

  for (const rule of rules) {
    let result: RunStats;
    if (rule.type === "GOAL_NOT_SUBMITTED")    result = await processGoalNotSubmitted(rule, activeCycle);
    else if (rule.type === "GOAL_NOT_APPROVED") result = await processGoalNotApproved(rule, activeCycle);
    else if (rule.type === "CHECKIN_NOT_COMPLETED") result = await processCheckinNotCompleted(rule, activeCycle);
    else result = { eventsCreated: 0, escalated: 0, resolved: 0 };

    totals.eventsCreated += result.eventsCreated;
    totals.escalated     += result.escalated;
    totals.resolved      += result.resolved;
  }

  return totals;
}
