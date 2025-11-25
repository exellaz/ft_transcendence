import { tournaments, generateTournamentId } from "./tournament.routes";
import { addWinnerToNextTournament } from "./handleNextTournament";
import WebSocket from "ws";
import { PlacementEntry, TournamentLobby } from "../../types/interface";
import {
  createTournamentMatch,
  createTournamentPlayer,
  updateTournamentPlayerRanking,
  updateTournamentStatus,
} from "./tournament.service";

/**
 * @brief Save the match result to the database and update tournament state.
 * @param result - The result of the match.
 * @param TournamentLobbyDb - Database record of the tournament lobby.
 * @param playerPair - Array of two players who participated in the match.
 * @param tournamentInfo - Information about the tournament lobby.
 */
export async function saveMatchResult(
  result: {
    leftPlayerId: number;
    rightPlayerId: number;
    scoreLeft: number;
    scoreRight: number;
    winnerId: string | number | "draw";
    duration: number;
    rank?: number | undefined;
  },
  TournamentLobbyDb: { id: number; status: string; createdAt: Date },
  playerPair: { id: number; username: string; spriteUrl: string }[],
  tournamentInfo: TournamentLobby,
) {
  const tournament = tournaments.get(tournamentInfo.id);
  if (!tournament) return;

  tournament.playerMap = tournament.playerMap || new Map<number, number>();

  // ✅ Initialize tracking set for players whose rank has been updated
  if (!tournament.rankUpdatedPlayers) {
    tournament.rankUpdatedPlayers = new Set<number>();
  }

  // if is a dummy and remove them
  const isDummyLeft =
    tournament.dummyPlayers?.has(result.leftPlayerId) || false;
  const isDummyRight =
    tournament.dummyPlayers?.has(result.rightPlayerId) || false;

  if (isDummyLeft || isDummyRight) {
    // Remove dummies from players array
    if (isDummyLeft) {
      tournament.players = tournament.players.filter(
        (p) => p.id !== result.leftPlayerId,
      );
      tournament.dummyPlayers?.delete(result.leftPlayerId);
      console.log(
        `[Tournament ${tournamentInfo.id}] Removed dummy player id: ${result.leftPlayerId}`,
      );
    }

    if (isDummyRight) {
      tournament.players = tournament.players.filter(
        (p) => p.id !== result.rightPlayerId,
      );
      tournament.dummyPlayers?.delete(result.rightPlayerId);
      console.log(
        `[Tournament ${tournamentInfo.id}] Removed dummy player id: ${result.rightPlayerId}`,
      );
    }

    // Broadcast updated player list to remaining clients
    if (tournament.broadcast) {
      tournament.broadcast(
        JSON.stringify({
          type: "playerLeft",
          players: tournament.players,
        }),
      );
    }
  }

  //build createdPlayer array by reusing existing players in playerMap if any
  const createdPlayer: {
    success: boolean;
    data?: {
      id: number;
      tournamentId: number;
      userId: number;
      ranking: number;
    };
    error?: string;
  }[] = [];
  for (const player of playerPair) {
    const userId = player.id;

    //if player map has this user, reuse it avoid create tournament player DB again
    const existingTournamentPlayerId = tournament.playerMap.get(userId);
    if (existingTournamentPlayerId) {
      console.log(
        `[tournament player database] Reusing existing tournament player for user ${userId} with tournament player id ${existingTournamentPlayerId}`,
      );
      createdPlayer.push({
        success: true,
        data: {
          id: existingTournamentPlayerId,
          tournamentId: tournamentInfo.id,
          userId: userId,
          ranking: 0, //ranking will update later
        },
      });
      continue;
    }

    //else create new tournament player DB record
    const TournamentPlayer = await createTournamentPlayer({
      tournamentId: TournamentLobbyDb.id,
      userId: player.id,
      ranking: 0,
    });
    if (TournamentPlayer.success && TournamentPlayer.data) {
      createdPlayer.push({
        success: true,
        data: {
          ...TournamentPlayer.data,
          ranking: TournamentPlayer.data.ranking ?? 0,
        },
      });
      tournament.playerMap.set(userId, TournamentPlayer.data.id);
    } else {
      console.log(
        `[tournament player database] tournament player creation failed: `,
        TournamentPlayer.error,
      );
      return;
    }
  }

  //create match record in database
  for (let i = 0; i < createdPlayer.length; i++) {
    const player1 = createdPlayer[i];
    const player2 = createdPlayer[i + 1];
    if (!player2 || !player1) continue;
    const matchResult = await createTournamentMatch({
      tournamentId: TournamentLobbyDb.id,
      round: tournamentInfo?.stage ?? "unknown",
      player1Id: player1.data!.id,
      player2Id: player2.data!.id,
      winnerId:
        result.winnerId === "draw"
          ? -1
          : result.winnerId === result.leftPlayerId
            ? player1.data!.id
            : player2.data!.id,
      player1Score: result.scoreLeft,
      player2Score: result.scoreRight,
    });
    if (matchResult.success && matchResult.data)
      console.log(`[tournament match database] created: `, matchResult.data);
    else
      console.log(
        `[tournament match database] creation failed: `,
        matchResult.error,
      );
  }

  // ✅ NEW: Create next tournament if this is the first match to finish
  const isFirstMatchOfStage =
    !tournament.result || tournament.result.length === 0;
  const shouldCreateNextTournament =
    isFirstMatchOfStage &&
    (tournamentInfo.stage === "QF" || tournamentInfo.stage === "SF");

  if (shouldCreateNextTournament && !tournament.nextTournamentId) {
    const nextStageMap: Record<string, "SF" | "F" | null> = {
      QF: "SF",
      SF: "F",
      F: null,
    };
    const nextStage = nextStageMap[tournamentInfo.stage];

    if (nextStage) {
      console.log(
        `[Tournament ${tournamentInfo.id}] Creating next tournament for stage ${nextStage}`,
      );

      const nextTournamentId = generateTournamentId();
      const nextTournament: TournamentLobby = {
        id: nextTournamentId,
        name: `Tournament ${nextTournamentId}`,
        players: [],
        lock: false,
        stage: nextStage,
        countdownTimer: undefined,
        countdownRemaining: undefined,
        maxPlayer: nextStage === "SF" ? 4 : 2,
        tournamentDb: TournamentLobbyDb,
        allowedPlayers: new Set<number>(),
        nextStageExpectedPlayers: [],
        parentTournamentId: tournamentInfo.id,
      };

      tournaments.set(nextTournamentId, nextTournament);
      tournament.nextTournamentId = nextTournamentId;

      console.log(
        `[Tournament ${nextTournamentId}] Created next tournament (${nextStage}), waiting for winners...`,
      );
    }
  }

  // Add winner to next tournament immediately
  if (
    result.winnerId !== "draw" &&
    typeof result.winnerId === "number" &&
    tournament.nextTournamentId
  ) {
    addWinnerToNextTournament(tournamentInfo.id, result.winnerId);
  }

  // Update loser's ranking immediately after game ends
  if (result.rank !== undefined && result.winnerId !== "draw") {
    const loserId =
      result.winnerId === result.leftPlayerId
        ? result.rightPlayerId
        : result.leftPlayerId;

    const loserTournamentPlayerId = tournament.playerMap.get(loserId);
    if (loserTournamentPlayerId) {
      const updateResult = await updateTournamentPlayerRanking(
        result.rank,
        loserTournamentPlayerId,
      );
      if (updateResult.success) {
        tournament.rankUpdatedPlayers.add(loserId);
        console.log(
          `[tournament player database] ✅ Successfully updated loser ranking`,
          updateResult.data,
        );
      } else {
        console.warn(
          `[tournament player database] ❌ Failed to update loser ranking:`,
          updateResult.error,
        );
      }
    }

    // ✅ NEW: Update winner's ranking if it's the final match
    if (tournamentInfo.stage === "F" && typeof result.winnerId === "number") {
      const winnerRank = 1; // Winner of final gets rank 1
      const winnerTournamentPlayerId = tournament.playerMap.get(
        result.winnerId,
      );

      if (winnerTournamentPlayerId) {
        const winnerUpdateResult = await updateTournamentPlayerRanking(
          winnerRank,
          winnerTournamentPlayerId,
        );
        if (winnerUpdateResult.success) {
          tournament.rankUpdatedPlayers.add(result.winnerId);
          console.log(
            `[tournament player database] ✅ Successfully updated winner ranking`,
            winnerUpdateResult.data,
          );
        } else {
          console.warn(
            `[tournament player database] ❌ Failed to update winner ranking:`,
            winnerUpdateResult.error,
          );
        }
      }
    }
  }

  //after create player and save match result, update player rank
  const resultCopy = {
    playerId:
      result.winnerId === "draw"
        ? null
        : typeof result.winnerId === "number"
          ? result.winnerId
          : null,
    stage: tournamentInfo.stage,
    scoreLeft: result.scoreLeft,
    scoreRight: result.scoreRight,
    winnerId:
      result.winnerId === "draw"
        ? null
        : typeof result.winnerId === "number"
          ? result.winnerId
          : null,
    duration: result.duration,
  };

  //update player map and tournament result
  const t = tournaments.get(tournamentInfo.id);
  if (!t) return;
  t.playerMap = t.playerMap || new Map<number, number>();
  for (const p of createdPlayer) {
    if (p.data) t.playerMap.set(p.data.userId, p.data.id);
  }

  //update tournament result
  t.result = t.result || [];
  t.result.push(resultCopy);

  //check if need to handle next stage
  const TotalMatches =
    tournamentInfo.stage === "QF"
      ? 4
      : tournamentInfo.stage === "SF"
        ? 2
        : tournamentInfo.stage === "F"
          ? 1
          : 0;

  //check current all match finished
  const finishedMatches = t.result.filter(
    (r) => r.stage === tournamentInfo.stage,
  ).length;

  //if all matches finished, handle next stage
  if (finishedMatches === TotalMatches) {
    console.log(
      `Tournament ${tournamentInfo.id} stage ${tournamentInfo.stage} completed.`,
    );
    await handleNextRound(
      tournamentInfo.id,
      tournamentInfo.stage,
      TournamentLobbyDb,
    );
  }
}

/**
 * @brief Handle the transition to the next round of the tournament (if is final then set database complete)
 * @param tournamentId - The ID of the tournament.
 * @param currentStage - The current stage of the tournament ("QF", "SF", "F").
 * @param TournamentLobbyDb - Database record of the tournament lobby.
 */
async function handleNextRound(
  tournamentId: number,
  currentStage: "QF" | "SF" | "F",
  TournamentLobbyDb: { id: number; status: string; createdAt: Date },
) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  // ✅ Only update tournament status if it's the final
  if (currentStage === "F") {
    console.log(`Tournament ${tournamentId} completed.`);
    const updateTournamentDB = await updateTournamentStatus(
      "COMPLETED",
      TournamentLobbyDb.id,
    );
    console.log(
      "[tournament database] Tournament status updated to COMPLETED: ",
      updateTournamentDB,
    );

    // Clean up tracking set and placements
    if (tournament.rankUpdatedPlayers) {
      console.log(
        `[tournament player database] Final rankings saved for ${tournament.rankUpdatedPlayers.size} players`,
      );
      tournament.rankUpdatedPlayers.clear();
    }
    if (tournament.placements) {
      tournament.placements = [];
    }
  } else {
    console.log(
      `Stage ${currentStage} completed for tournament ${tournamentId}. Winners will advance to next stage.`,
    );
  }
}
