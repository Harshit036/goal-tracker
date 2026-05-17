// Client-safe: no server-only imports. Used by both API routes and UI components.

export const CYCLE_PHASES = [
  "GOAL_SETTING",
  "Q1_CHECKIN",
  "Q2_CHECKIN",
  "Q3_CHECKIN",
  "Q4_ANNUAL",
  "CLOSED",
] as const;

export type CyclePhase = (typeof CYCLE_PHASES)[number];

// OCP: adding a new phase = adding one entry here. No other code changes required.
export const PHASE_CONFIG: Record<
  CyclePhase,
  { label: string; description: string; cycleStatus: string; order: number }
> = {
  GOAL_SETTING: {
    label: "Goal Setting",
    description: "Employees create and submit goals for manager approval.",
    cycleStatus: "GOAL_SETTING",
    order: 0,
  },
  Q1_CHECKIN: {
    label: "Q1 Check-in",
    description: "Managers review and log Q1 quarter progress.",
    cycleStatus: "ACTIVE",
    order: 1,
  },
  Q2_CHECKIN: {
    label: "Q2 Check-in",
    description: "Managers review and log Q2 quarter progress.",
    cycleStatus: "ACTIVE",
    order: 2,
  },
  Q3_CHECKIN: {
    label: "Q3 Check-in",
    description: "Managers review and log Q3 quarter progress.",
    cycleStatus: "ACTIVE",
    order: 3,
  },
  Q4_ANNUAL: {
    label: "Q4 / Annual",
    description: "Annual review and final score computation.",
    cycleStatus: "ACTIVE",
    order: 4,
  },
  CLOSED: {
    label: "Closed",
    description: "Cycle complete. All data is read-only.",
    cycleStatus: "CLOSED",
    order: 5,
  },
};

// Pure function — derives current phase from window flags. No side effects.
export function getCurrentPhase(
  windows: { phase: string; isOpen: boolean }[]
): CyclePhase {
  const open = windows.find((w) => w.isOpen);
  return (open?.phase as CyclePhase) ?? "CLOSED";
}
