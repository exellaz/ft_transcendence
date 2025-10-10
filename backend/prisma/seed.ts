import { FriendshipStatus, PrismaClient, RoundType, TournamentPlayer, TournamentStatus } from "@prisma/client";
import { hashPassword } from "../src/modules/users/users.service";
const prisma = new PrismaClient();



interface SeedOptions {
  userCount: number;
  tournamentCount: number;
  playersPerTournament: number;
  matchesPerTournament: number;
}

async function seed({ userCount, tournamentCount, playersPerTournament, matchesPerTournament }: SeedOptions) {
  await prisma.user.deleteMany();
  // reset the sequence manually (id start from 1)
  await prisma.$executeRawUnsafe(
    `DELETE FROM sqlite_sequence WHERE name='users';`,
  );
  
  for (let i = 1; i <= userCount; i++) {
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
  console.log(`✅ Seeded ${userCount} users`);
  
  const friendshipCount = userCount - 2; // reserve last user for bruno test create-friendship
  const statuses: FriendshipStatus[] = ["accepted", "pending"];
  
  for (let i = 1; i <= friendshipCount; i++) {
    const status = statuses[(i - 1) % statuses.length]; // rotate statuses
    await prisma.friendship.create({
      data: {
        requesterId: 1,
        accepterId: i + 1,
        status,
      },
    });
  }
  
  console.log(
    `✅ Seeded ${friendshipCount} friendships equally across accepted and pending`,
  );
  
  const blockedFriendshipCount = 4;
  
  for (let i = 1; i <= blockedFriendshipCount; i++) {
    await prisma.blockedFriendship.create({
      data: {
        blockerId: 1,
        blockedId: i + 1,
      },
    });
  }
  
  console.log(`✅ Seeded ${blockedFriendshipCount} blocked friendships`);
  
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
  
  console.log(
    `✅ Seeded ${acceptedFriendships.length * messagesPerFriendship} friend chat messages`,
  );
  console.log(`🌱 Seeding ${tournamentCount} tournaments...`);

  for (let t = 1; t <= tournamentCount; t++) {
    const tournament = await prisma.tournament.create({
      data: {
        status: TournamentStatus.COMPLETED,
      },
    });

    console.log(`🏆 Created Tournament ${tournament.id}`);

    // Create players
    const players:TournamentPlayer[] = [];
    for (let p = 1; p <= playersPerTournament; p++) {
      const player = await prisma.tournamentPlayer.create({
        data: {
          tournamentId: tournament.id,
          userId: p, // you could randomize this or link to a User table
          ranking: p,
        },
      });
      players.push(player);
    }

    console.log(`👥 Created ${players.length} players for tournament ${tournament.id}`);

    // Create matches
    for (let m = 1; m <= matchesPerTournament; m++) {
      // randomly select two different players
      const [p1, p2] = getTwoDistinct(players);

      // random winner
      const winner = Math.random() > 0.5 ? p1 : p2;
      const player1Score = Math.floor(Math.random() * 10);
      const player2Score = Math.floor(Math.random() * 10);

      await prisma.tournamentMatch.create({
        data: {
          tournamentId: tournament.id,
          round: randomRound(),
          player1Id: p1.id,
          player2Id: p2.id,
          winnerId: winner.id,
          player1Score,
          player2Score,
        },
      });
    }

    console.log(`⚔️ Created ${matchesPerTournament} matches for tournament ${tournament.id}`);
  }

  console.log('✅ Seeding complete!');
  await prisma.$disconnect();
}

// Helper: randomly select two distinct players
function getTwoDistinct<T>(arr: T[]): [T, T] {
  const first = arr[Math.floor(Math.random() * arr.length)];
  let second = arr[Math.floor(Math.random() * arr.length)];
  while (second === first) {
    second = arr[Math.floor(Math.random() * arr.length)];
  }
  return [first, second];
}

// Helper: random round type
function randomRound(): RoundType {
  const rounds = Object.values(RoundType);
  return rounds[Math.floor(Math.random() * rounds.length)];
}


seed({
  userCount: 10, // must be > 2
  tournamentCount: 3,        
  playersPerTournament: 8,  // must be <= userCount
  matchesPerTournament: 7,
})
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
