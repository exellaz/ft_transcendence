import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const num = 10; // 👈 set how many users you want
  await prisma.user.deleteMany();
	// reset the sequence manually (id start from 1)
	await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='users';`);

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

  console.log(`✅ Seeded ${num} users with settings`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
