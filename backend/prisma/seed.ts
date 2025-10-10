import { FriendshipStatus, PrismaClient, RoundType, TournamentPlayer, TournamentStatus } from "@prisma/client";
import { hashPassword } from "../src/modules/users/users.service";
import fs, { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

interface SeedOptions {
  userCount: number;
  tournamentCount: number;
  playersPerTournament: number;
  matchesPerTournament: number;
}

async function seed({ userCount, tournamentCount, playersPerTournament, matchesPerTournament }: SeedOptions) {
  await prisma.user.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.blockedFriendship.deleteMany();
  await prisma.friendChatMessage.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.tournamentMatch.deleteMany();
  await prisma.tournamentPlayer.deleteMany();

  // reset the sequence manually (id start from 1)
  await prisma.$executeRawUnsafe(
    `DELETE FROM sqlite_sequence;`,
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

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.join(__dirname, 'mockTournamentData.json');
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  console.log(`🌱 Seeding ${data.tournaments.length} tournaments...`);

  for (const tournamentData of data.tournaments) {
    const tournament = await prisma.tournament.upsert({
      where: { id: tournamentData.id },
      update: { status: TournamentStatus.COMPLETED },
      create: { id: tournamentData.id, status: TournamentStatus.COMPLETED }
    });

    console.log(`🏆 Upserted Tournament ${tournament.id}`);

    // Create Players
    const players: TournamentPlayer[] = [];
    for (const p of tournamentData.players) {
      const player = await prisma.tournamentPlayer.upsert({
        where: { id: p.id },
        update: {
          tournamentId: tournament.id,
          userId: p.userId,
          ranking: p.ranking
        },
        create: {
          id: p.id,
          tournamentId: tournament.id,
          userId: p.userId,
          ranking: p.ranking
        }
      });
      players.push(player);
    }

    console.log(`👥 Created ${players.length} players for Tournament ${tournament.id}`);

    // Create Matches
    for (const m of tournamentData.matches) {
      const p1 = players[m.player1Index - 1];
      const p2 = players[m.player2Index - 1];

      const winner = m.player1Score > m.player2Score ? p1 : p2;

      await prisma.tournamentMatch.create({
        data: {
          tournamentId: tournament.id,
          round: m.round,
          player1Id: p1.id,
          player2Id: p2.id,
          winnerId: winner.id,
          player1Score: m.player1Score,
          player2Score: m.player2Score
        }
      });
    }

    console.log(`⚔️ Created ${tournamentData.matches.length} matches for Tournament ${tournament.id}`);
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
