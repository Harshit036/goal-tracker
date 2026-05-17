-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SharedGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pushedBy" TEXT NOT NULL,
    "sourceGoalId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SharedGoal_pushedBy_fkey" FOREIGN KEY ("pushedBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedGoal_sourceGoalId_fkey" FOREIGN KEY ("sourceGoalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SharedGoal" ("createdAt", "id", "pushedBy", "sourceGoalId") SELECT "createdAt", "id", "pushedBy", "sourceGoalId" FROM "SharedGoal";
DROP TABLE "SharedGoal";
ALTER TABLE "new_SharedGoal" RENAME TO "SharedGoal";
CREATE UNIQUE INDEX "SharedGoal_sourceGoalId_key" ON "SharedGoal"("sourceGoalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
