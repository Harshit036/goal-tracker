-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GoalCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'GOAL_SETTING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GoalCycle" ("createdAt", "id", "isActive", "name", "updatedAt", "year") SELECT "createdAt", "id", "isActive", "name", "updatedAt", "year" FROM "GoalCycle";
DROP TABLE "GoalCycle";
ALTER TABLE "new_GoalCycle" RENAME TO "GoalCycle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
