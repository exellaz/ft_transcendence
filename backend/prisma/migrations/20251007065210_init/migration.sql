/*
  Warnings:

  - You are about to drop the `blocked_user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "blocked_user";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "blocked_friendship" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "blocker_id" INTEGER NOT NULL,
    "blocked_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocked_friendship_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "blocked_friendship_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "friend_chat_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "friendshipId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "friend_chat_messages_friendshipId_fkey" FOREIGN KEY ("friendshipId") REFERENCES "friendships" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "friend_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "blocked_friendship_blocker_id_blocked_id_key" ON "blocked_friendship"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "idx_friend_chat_messages_friendship" ON "friend_chat_messages"("friendshipId");
