import { PrismaClient, RoundType, TournamentStatus } from "@prisma/client";

const prisma = new PrismaClient();

export interface TournamentPlayerInput {
  tournamentId: number;
  userId: number;
  ranking: number;
}

export interface TournamentMatchInput {
  tournamentId: number;
  round: RoundType;
  player1Id: number;
  player2Id: number;
  winnerId: number;
  player1Score: number;
  player2Score: number;
}

// create Tournament
export async function createTournament() {
  try {
    const tournament = await prisma.tournament.create({
      data: {
        status: TournamentStatus.NOT_COMPLETE,
      },
    });

    // ✅ Return success response
    return {
      success: true,
      data: tournament,
    };
  } catch (error) {
    console.error('Error creating tournament:', error);

    // ❌ Return standardized error response
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// create TournamentPlayer
export async function createTournamentPlayer(p: TournamentPlayerInput) {
  try {

    const tournamentPlayer = await prisma.tournamentPlayer.create({
      data: {
        tournamentId: p.tournamentId,
        userId: p.userId,
        ranking: p.ranking,     
      },
    });

    // ✅ Return success response
    return {
      success: true,
      data: tournamentPlayer,
    };
  } catch (error) {
    console.error('Error creating tournamentPlayer:', error);

    // ❌ Return standardized error response
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// create TournamentMatch
export async function createTournamentMatch(m: TournamentMatchInput) {
  try {
    if (m.player1Id === m.player2Id)
      throw new Error("A player cannot play against themselves");
    if (m.winnerId !== m.player1Id && m.winnerId !== m.player2Id)
      throw new Error("Winner must be one of the players");
    if (m.player1Score < 0 || m.player2Score < 0)
      throw new Error("Scores must be non-negative");
    if (m.player1Score === m.player2Score)
      throw new Error("Scores cannot be tied");
    const actualWinner = m.player1Score > m.player2Score ? m.player1Id : m.player2Id;
    if (m.winnerId !== actualWinner)
      throw new Error("Winner does not match score result");

    const [p1, p2] = await prisma.tournamentPlayer.findMany({
      where: { id: { in: [m.player1Id, m.player2Id] } },
      select: { id: true, tournamentId: true },
    });
    if (p1 === undefined || p2 === undefined)
      throw new Error("Both players must exist");
    if (p1.tournamentId !== p2.tournamentId || p1.tournamentId !== m.tournamentId) {
      throw new Error("Players must belong to the same tournament");
    }

    const tournamentMatch = await prisma.tournamentMatch.create({
      data: {
        tournamentId: m.tournamentId,
        round: m.round,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        winnerId: m.winnerId,
        player1Score: m.player1Score,
        player2Score: m.player2Score,   
      },
    });

    // ✅ Return success response
    return {
      success: true,
      data: tournamentMatch,
    };
  } catch (error) {
    console.error('Error creating tournamentMatch:', error);

    // ❌ Return standardized error response
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}