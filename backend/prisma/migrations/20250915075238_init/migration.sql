/*
  Warnings:

  - The primary key for the `user_settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `user_settings` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_settings" (
    "user_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL DEFAULT 'english',
    "text_size" TEXT NOT NULL DEFAULT 'medium',
    "in_game_camera_tracking" TEXT NOT NULL DEFAULT 'static',
    CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_user_settings" ("in_game_camera_tracking", "language", "text_size", "user_id") SELECT "in_game_camera_tracking", "language", "text_size", "user_id" FROM "user_settings";
DROP TABLE "user_settings";
ALTER TABLE "new_user_settings" RENAME TO "user_settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
