import { PrismaClient } from "@prisma/client";

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

  num = 5;
  for (let i = 1; i <= num; i++) {
    await prisma.friendship.create({
      data: {
        userId: i,
        friendId: i + 1,
        status: "accepted",
      },
    });
  }
  console.log(`✅ Seeded ${num} friendships`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
