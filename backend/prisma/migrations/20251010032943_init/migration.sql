-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tournament_players" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ranking" INTEGER DEFAULT 0,
    CONSTRAINT "tournament_players_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tournament_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tournament_players" ("id", "ranking", "tournament_id", "user_id") SELECT "id", "ranking", "tournament_id", "user_id" FROM "tournament_players";
DROP TABLE "tournament_players";
ALTER TABLE "new_tournament_players" RENAME TO "tournament_players";
CREATE UNIQUE INDEX "tournament_players_tournament_id_user_id_key" ON "tournament_players"("tournament_id", "user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
