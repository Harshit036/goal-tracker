// Business rules — single source of truth for all validation
export const GOAL_RULES = {
  MAX_GOALS: 8,
  MIN_WEIGHTAGE: 10,
  TOTAL_WEIGHTAGE: 100,
  MAX_SCORE: 150, // capped achievement score
} as const;

export const CYCLE_STATUS = {
  GOAL_SETTING: "GOAL_SETTING",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;

export const SHEET_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  REWORK: "REWORK",
  APPROVED: "APPROVED",
} as const;

export const ACHIEVEMENT_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  ON_TRACK: "ON_TRACK",
  COMPLETED: "COMPLETED",
} as const;

export const UOM_TYPE = {
  NUMERIC_MIN: "NUMERIC_MIN",
  NUMERIC_MAX: "NUMERIC_MAX",
  TIMELINE: "TIMELINE",
  ZERO: "ZERO",
} as const;

export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
export type Quarter = (typeof QUARTERS)[number];

export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
} as const;
