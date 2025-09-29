import { FriendshipStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();
	// reset the sequence manually (id start from 1)
	await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='users';`);

  let num = 10; // 👈 set how many users you want
  for (let i = 1; i <= num; i++) {
    await prisma.user.create({
      data: {
        username: `username${i}`,
        email: `username${i}@gmail.com`,
        password: `username${i}pw`,
        settings: {
          create: {}, // uses defaults
        },
      },
    });
  }

  num = 9; // make sure this is divisible by 3 for equal distribution
  const statuses: FriendshipStatus[] = ["accepted", "pending", "blocked"];

  for (let i = 1; i <= num; i++) {
    const status = statuses[(i - 1) % statuses.length]; // rotate statuses
    await prisma.friendship.create({
      data: {
        userId: 1,
        friendId: i + 1,
        status,
      },
    });
  }

  console.log(`✅ Seeded ${num} friendships equally across accepted, pending, and blocked`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
