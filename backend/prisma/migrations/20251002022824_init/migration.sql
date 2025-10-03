-- RedefineIndex
DROP INDEX "idx_friendships_friend";
CREATE INDEX "idx_friendships_accepter" ON "friendships"("friend_id");

-- RedefineIndex
DROP INDEX "idx_friendships_user";
CREATE INDEX "idx_friendships_requester" ON "friendships"("user_id");
