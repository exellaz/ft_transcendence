/*
  Warnings:

  - You are about to drop the column `in_game_camera_tracking` on the `user_settings` table. All the data in the column will be lost.
  - You are about to drop the column `text_size` on the `user_settings` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_settings" (
    "user_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL DEFAULT 'english',
    CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_settings" ("language", "user_id") SELECT "language", "user_id" FROM "user_settings";
DROP TABLE "user_settings";
ALTER TABLE "new_user_settings" RENAME TO "user_settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
