-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "entityId", "entityType", "id", "newValue", "oldValue", "userId") SELECT "action", "createdAt", "entityId", "entityType", "id", "newValue", "oldValue", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE TABLE "new_CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalSheetId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CheckIn_goalSheetId_fkey" FOREIGN KEY ("goalSheetId") REFERENCES "GoalSheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CheckIn" ("comment", "createdAt", "goalSheetId", "id", "managerId", "quarter", "updatedAt") SELECT "comment", "createdAt", "goalSheetId", "id", "managerId", "quarter", "updatedAt" FROM "CheckIn";
DROP TABLE "CheckIn";
ALTER TABLE "new_CheckIn" RENAME TO "CheckIn";
CREATE UNIQUE INDEX "CheckIn_goalSheetId_quarter_key" ON "CheckIn"("goalSheetId", "quarter");
CREATE TABLE "new_GoalSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "managerNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoalSheet_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalSheet_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "GoalCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GoalSheet" ("createdAt", "cycleId", "employeeId", "id", "managerNote", "status", "updatedAt") SELECT "createdAt", "cycleId", "employeeId", "id", "managerNote", "status", "updatedAt" FROM "GoalSheet";
DROP TABLE "GoalSheet";
ALTER TABLE "new_GoalSheet" RENAME TO "GoalSheet";
CREATE UNIQUE INDEX "GoalSheet_employeeId_cycleId_key" ON "GoalSheet"("employeeId", "cycleId");
CREATE TABLE "new_SharedGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pushedBy" TEXT NOT NULL,
    "sourceGoalId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SharedGoal_pushedBy_fkey" FOREIGN KEY ("pushedBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedGoal_sourceGoalId_fkey" FOREIGN KEY ("sourceGoalId") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SharedGoal" ("createdAt", "id", "pushedBy", "sourceGoalId") SELECT "createdAt", "id", "pushedBy", "sourceGoalId" FROM "SharedGoal";
DROP TABLE "SharedGoal";
ALTER TABLE "new_SharedGoal" RENAME TO "SharedGoal";
CREATE UNIQUE INDEX "SharedGoal_sourceGoalId_key" ON "SharedGoal"("sourceGoalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
