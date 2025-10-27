import { PrismaClient, BlockedFriendship } from "@prisma/client";
import { userPublicSelect } from "src/modules/users/users.select";

const prisma = new PrismaClient();

export async function getAcceptedFriends(userId: number) {
  /**
   *    Fetch all users who are in an accepted friendship with the current user.
   *    includes both directions (sent & received), and select only the public fields.
   *    Additionally,`id` of the accepted friendship is included
   */
  const friends = await prisma.user.findMany({
    where: {
      OR: [
        {
          sentFriendships: {
            some: { accepterId: userId, status: "accepted" },
          },
        },
        {
          receivedFriendships: {
            some: { requesterId: userId, status: "accepted" },
          },
        },
      ],
    },
    select: {
      // include friendshipId
      ...userPublicSelect,
      sentFriendships: {
        where: { accepterId: userId, status: "accepted" },
        select: { id: true },
      },
      receivedFriendships: {
        where: { requesterId: userId, status: "accepted" },
        select: { id: true },
      },
    },
  });

  // Get all block relationships involving the current user.
  const blocked: BlockedFriendship[] = await prisma.blockedFriendship.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
  });

  // Build a set of all user IDs that are blocked (in either direction).
  const blockedIds = new Set(
    blocked.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId)),
  );

  /**
   * Format users:
   *    - Filter out blocked users
   *    - Exclude sentFriendships / receivedFriendships from the output
   *    - Compute a single `friendshipId` (from sent or received)
   */
  const formatted = friends
    .filter((u) => !blockedIds.has(u.id))
    .map(({ sentFriendships, receivedFriendships, ...user }) => ({
      ...user,
      friendshipId:
        sentFriendships[0]?.id ?? receivedFriendships[0]?.id ?? null,
    }));

  return formatted;
}
