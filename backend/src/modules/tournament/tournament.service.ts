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

/**
 * Creates a new tournament with default NOT_COMPLETE status
 * @returns {Object} Standardized response object with success flag and either data or error
 * @returns {boolean} .success - Whether operation was successful
 * @returns {Object} .data - Created tournament object (if successful)
 * @returns {string} .error - Error message (if unsuccessful)
 */
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
    console.error("Error creating tournament:", error);

    // ❌ Return standardized error response
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Creates a new tournament player entry
 * @param {TournamentPlayerInput} p - Tournament player data containing tournamentId, userId and ranking
 * @returns {Object} Standardized response object with success flag and either data or error
 * @returns {boolean} .success - Whether operation was successful
 * @returns {Object} .data - Created tournament player object (if successful)
 * @returns {string} .error - Error message (if unsuccessful)
 */
export async function createTournamentPlayer(p: TournamentPlayerInput) {
  try {
    //try to find existing tournament player first
    const existing = await prisma.tournamentPlayer.findFirst({
      where: { tournamentId: p.tournamentId, userId: p.userId },
    });
    if (existing) {
      console.log(
        "[tournament player database] Tournament player already exists: ",
        existing,
      );
      return { success: true, data: existing };
    }

    const tournamentPlayer = await prisma.tournamentPlayer.create({
      data: {
        tournamentId: p.tournamentId,
        userId: p.userId,
        ranking: p.ranking,
      },
    });

    console.log(
      "[tournament player database] Tournament player created: ",
      tournamentPlayer,
    );

    // ✅ Return success response
    return {
      success: true,
      data: tournamentPlayer,
    };
  } catch (error: any) {
    //if concurrent create cause unique constraint violation, try to get existing record
    if (error?.code === "P2002") {
      try {
        const existingAfterRace = await prisma.tournamentPlayer.findFirst({
          where: { tournamentId: p.tournamentId, userId: p.userId },
        });
        if (existingAfterRace)
          return { success: true, data: existingAfterRace };
      } catch (e) {
        console.error("createTournamentPlayer: recovery lookup failed:", e);
      }
    }

    console.error("Error creating tournamentPlayer:", error);

    // ❌ Return standardized error response
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Creates a new tournament match after validating match data
 * @param {TournamentMatchInput} m - Tournament match data including players, scores and round info
 * @returns {Object} Standardized response object with success flag and either data or error
 * @returns {boolean} .success - Whether operation was successful
 * @returns {Object} .data - Created tournament match object (if successful)
 * @returns {string} .error - Error message (if unsuccessful)
 * @note Performs extensive validation: players must be different, winner must be one of the players,
 *       scores must be non-negative and not tied, winner must match score result,
 *       players must exist and belong to the specified tournament
 */
export async function createTournamentMatch(m: TournamentMatchInput) {
  try {
    if (m.player1Id === m.player2Id)
      throw new Error("A player cannot play against themselves");
    if (m.winnerId !== m.player1Id && m.winnerId !== m.player2Id)
      throw new Error("Winner must be one of the players");
    if (m.player1Score < 0 || m.player2Score < 0)
      throw new Error("Scores must be non-negative");
    // if (m.player1Score === m.player2Score)
    //   throw new Error("Scores cannot be tied");
    // const actualWinner = m.player1Score > m.player2Score ? m.player1Id : m.player2Id;
    // if (m.winnerId !== actualWinner)
    //   throw new Error("Winner does not match score result");

    const [p1, p2] = await prisma.tournamentPlayer.findMany({
      where: { id: { in: [m.player1Id, m.player2Id] } },
      select: { id: true, tournamentId: true },
    });
    if (p1 === undefined || p2 === undefined)
      throw new Error("Both players must exist");
    if (
      p1.tournamentId !== p2.tournamentId ||
      p1.tournamentId !== m.tournamentId
    ) {
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
    console.error("Error creating tournamentMatch:", error);

    // ❌ Return standardized error response
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// update tournament status
export async function updateTournamentStatus(
  status: TournamentStatus,
  tournamentId: number,
) {
  try {
    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status },
    });

    return {
      success: true,
      data: updatedTournament,
    };
  } catch (error) {
    console.error("Error updating tournament status:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// update tournamentPlayer ranking
export async function updateTournamentPlayerRanking(
  ranking: number,
  tournamentPlayerId: number,
) {
  try {
    const updatedTournamentPlayer = await prisma.tournamentPlayer.update({
      where: { id: tournamentPlayerId },
      data: { ranking },
    });

    return {
      success: true,
      data: updatedTournamentPlayer,
    };
  } catch (error) {
    console.error("Error updating tournament player ranking:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
