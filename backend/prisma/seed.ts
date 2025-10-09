import { FriendshipStatus, PrismaClient } from "@prisma/client";
import {hashPassword } from "../src/modules/users/users.service"
const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();
	// reset the sequence manually (id start from 1)
	await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='users';`);

  let num = 10; // 👈 set how many users you want
  for (let i = 1; i <= num; i++) {

    const password = await hashPassword("Password1");

    await prisma.user.create({
      data: {
        username: `username${i}`,
        email: `username${i}@gmail.com`,
        password: password,
        settings: {
          create: {}, // uses defaults
        },
      },
    });
  }
  console.log(`✅ Seeded ${num} users`);


  num = 7;
  const statuses: FriendshipStatus[] = ["accepted", "pending"];

  for (let i = 1; i <= num; i++) {
    const status = statuses[(i - 1) % statuses.length]; // rotate statuses
    await prisma.friendship.create({
      data: {
        requesterId: 1,
        accepterId: i + 1,
        status,
      },
    });
  }

  console.log(`✅ Seeded ${num} friendships equally across accepted and pending`);

  num = 6;

  for (let i = 1; i <= num; i++) {
    await prisma.blockedFriendship.create({
      data: {
        blockerId: 1,
        blockedId: i + 1,
      },
    });
  }

  console.log(`✅ Seeded ${num} blocked friendships`);

  // --- SEED FRIEND CHAT MESSAGES ---
  const acceptedFriendships = await prisma.friendship.findMany({
    where: { status: "accepted" },
  });

  const messagesPerFriendship = 3;

  for (const friendship of acceptedFriendships) {
    const { requesterId, accepterId, id: friendshipId } = friendship;

    for (let j = 1; j <= messagesPerFriendship; j++) {
      const senderId = j % 2 === 0 ? accepterId : requesterId;

      await prisma.friendChatMessage.create({
        data: {
          friendshipId,
          senderId,
          message: `Hello ${j} from user ${senderId} in friendship ${friendshipId}`,
          timestamp: new Date(Date.now() - j * 60_000),
        },
      });
    }
  }

  console.log(`✅ Seeded ${acceptedFriendships.length * messagesPerFriendship} friend chat messages`);

}



main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
