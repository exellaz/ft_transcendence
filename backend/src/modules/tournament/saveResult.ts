import { tournaments, generateTournamentId } from "./tournament.routes";
import { addWinnerToNextTournament } from "./handleNextTournament";
import WebSocket from "ws";
import {
  PlacementEntry,
  TournamentLobby,
} from "../../types/interface";
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
      console.log(
        "[tournament player database] Tournament player created: ",
        TournamentPlayer.data,
      );
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

  // ✅ NEW: Add winner to next tournament immediately
  if (
    result.winnerId !== "draw" &&
    typeof result.winnerId === "number" &&
    tournament.nextTournamentId
  ) {
    addWinnerToNextTournament(tournamentInfo.id, result.winnerId);
  }

  // ✅ NEW: Update loser's ranking immediately after game ends
  if (result.rank !== undefined && result.winnerId !== "draw") {
    const loserId =
      result.winnerId === result.leftPlayerId
        ? result.rightPlayerId
        : result.leftPlayerId;

    const loserTournamentPlayerId = tournament.playerMap.get(loserId);
    if (loserTournamentPlayerId) {
      console.log(
        `[tournament player database] IMMEDIATE rank update for loser ${loserId} (tournamentPlayerId=${loserTournamentPlayerId}) to rank ${result.rank}`,
      );
      const updateResult = await updateTournamentPlayerRanking(
        result.rank,
        loserTournamentPlayerId,
      );
      if (updateResult.success) {
        tournament.rankUpdatedPlayers.add(loserId);
        console.log(
          `[tournament player database] ✅ Successfully updated loser ranking in DB immediately`,
        );
      } else {
        console.warn(
          `[tournament player database] ❌ Failed to update loser ranking:`,
          updateResult.error,
        );
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
  const finishedMatches = t.result.filter(
    (r) => r.stage === tournamentInfo.stage,
  ).length;
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
 * @brief Handle the transition to the next round of the tournament.
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

  // ✅ Ensure tracking set exists
  if (!tournament.rankUpdatedPlayers) {
    tournament.rankUpdatedPlayers = new Set<number>();
  }

  // If placements were computed by roomEndGame, apply them instead of recalculating.
  if (
    Array.isArray(tournament.placements) &&
    tournament.placements.length > 0
  ) {
    console.log(
      `[tournament player database] applying precomputed placements for tournament ${tournamentId}`,
    );
    await applyPlacementsToDB(tournamentId);
    if (currentStage === "F") {
      console.log(
        `Tournament ${tournamentId} completed with precomputed placements.`,
      );
      const updateTournamentDB = await updateTournamentStatus(
        "COMPLETED",
        TournamentLobbyDb.id,
      );
      console.log(
        "[tournament database] Tournament status updated to COMPLETED: ",
        updateTournamentDB,
      );
      // ✅ Clear tracking set when tournament completes
      tournament.rankUpdatedPlayers.clear();
    }
  } else {
    //collect winners and losers and results from current stage
    const ThisRoundResult = tournament.result?.filter(
      (r) => r.stage === currentStage,
    );
    const winners: {
      id: number;
      username: string;
      spriteUrl: string;
      ready: boolean;
    }[] = [];
    const losers: { id: number; duration: number }[] = [];

    // collect winners and losers from current stage
    for (const match of ThisRoundResult ?? []) {
      const matchInfo = tournament.matches?.find((m) =>
        m.players.some((p) => p.id === match.winnerId),
      );
      if (!matchInfo || !matchInfo.players[0] || !matchInfo.players[1])
        continue;
      const leftId = matchInfo.players[0].id;
      const rightId = matchInfo.players[1].id;
      if (match.winnerId === leftId) {
        winners.push({
          id: leftId,
          username: matchInfo.players[0].username,
          spriteUrl: matchInfo.players[0].spriteUrl,
          ready: false,
        });
        losers.push({ id: rightId, duration: match.duration ?? 0 });
      } else if (match.winnerId === rightId) {
        winners.push({
          id: rightId,
          username: matchInfo.players[1].username,
          spriteUrl: matchInfo.players[1].spriteUrl,
          ready: false,
        });
        losers.push({ id: leftId, duration: match.duration ?? 0 });
      }
    }

    // now compute ranks for losers (after collecting)
    losers.sort((a, b) => a.duration - b.duration);
    const stageRankMap: Record<string, [number, number]> = {
      QF: [5, 8],
      SF: [3, 4],
      F: [2, 2],
    };
    const minRank = stageRankMap[currentStage] ?? [0, 0];
    const loserStartRank = minRank[0] || 0;

    // assign ranks to losers
    const rankedLosers = losers.map((p, i) => ({
      playerId: p.id,
      rank: loserStartRank + i,
    }));

    //update the loser rankings in database before proceeding to next stage
    // ✅ Skip players whose rank was already updated immediately
    const updatePromises = rankedLosers
      .filter((rl) => !tournament.rankUpdatedPlayers?.has(rl.playerId))
      .map(async (rl) => {
        if (!tournament.playerMap) {
          console.warn(
            `No playerMap for tournament ${tournamentId}; cannot update ranking for ${rl.playerId}`,
          );
          return;
        }
        const tournamentPlayerId = tournament.playerMap.get(rl.playerId);
        if (!tournamentPlayerId) {
          console.warn(
            `No tournament player id for user ${rl.playerId} in tournament ${tournamentId}`,
          );
          return;
        }
        console.log(
          `[BATCH] Update player id ${tournamentPlayerId} (${rl.playerId}) ranking to ${rl.rank}`,
        );
        const result = await updateTournamentPlayerRanking(
          rl.rank,
          tournamentPlayerId,
        );
        if (result.success) {
          tournament.rankUpdatedPlayers?.add(rl.playerId);
        }
        return result;
      });

    await Promise.all(updatePromises);

    //handle next stage
    const nextStageMap: Record<string, string | null> = {
      QF: "SF",
      SF: "F",
      F: null,
    };
    const nextStage = nextStageMap[currentStage];

    // If this was the final (no nextStage), update the rank of the winners
    if (!nextStage) {
      // ✅ Skip winners whose rank was already updated
      const winnerRankPromises = winners
        .filter((w) => !tournament.rankUpdatedPlayers?.has(w.id))
        .map(async (w, idx) => {
          if (!tournament.playerMap) return;
          const tournamentPlayerId = tournament.playerMap.get(w.id);
          if (!tournamentPlayerId) {
            console.warn(
              `No tournament player id for winner ${w.id} in tournament ${tournamentId}`,
            );
            return;
          }
          const winnerRank = idx + 1; // first winner = 1
          console.log(
            `[BATCH] Update winner id ${tournamentPlayerId} (${w.id}) ranking to ${winnerRank}`,
          );
          const result = await updateTournamentPlayerRanking(
            winnerRank,
            tournamentPlayerId,
          );
          if (result.success) {
            tournament.rankUpdatedPlayers?.add(w.id);
          }
          return result;
        });
      await Promise.all(winnerRankPromises);
    }

    // If no next stage, finalize tournament
    if (!nextStage) {
      const winnerIds = winners.map((w) => w.id);
      tournament.players = winners;
      tournament.matches = [];
      tournament.result =
        tournament.result?.filter((r) => r.stage !== currentStage) ?? [];
      tournament.lock = false;

      // reset client map so only winners' sockets get registered when they reconnect or are transferred
      tournament.clientMap = new Map<
        WebSocket,
        { tournamentId: number; playerId: number }
      >();
      // record allowed players so WS can reject eliminated re-joins
      tournament.allowedPlayers = new Set<number>(winnerIds);

      console.log(
        `Tournament ${tournamentId} prepared NEW lobby for stage ${nextStage} with players:`,
        winnerIds,
      );

      console.log(`Tournament ${tournamentId} completed.`);
      const updateTournamentDB = await updateTournamentStatus(
        "COMPLETED",
        TournamentLobbyDb.id,
      );
      if (updateTournamentDB.success)
        console.log(
          "[ update tournament DB ] Tournament status updated to COMPLETED: ",
          updateTournamentDB.data,
        );
      else
        console.log(
          "[ update tournament DB ] Tournament status update failed: ",
          updateTournamentDB.error,
        );
      console.log(
        `[ update tournament DB ] Deleting tournament ${tournamentId} from memory.`,
      );
      tournament.dummyPlayers?.clear();
      tournament.rankUpdatedPlayers.clear();
      tournaments.delete(tournamentId);
      return;
    }
    return;
  }
}

/**
 * @brief Apply precomputed placements to the database. (player rankings)
 * @param tournamentId - The ID of the tournament.
 */
async function applyPlacementsToDB(tournamentId: number): Promise<void> {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  if (
    !Array.isArray(tournament.placements) ||
    tournament.placements.length === 0
  ) {
    console.debug(
      `[tournament player database] no placements to apply for ${tournamentId}`,
    );
    return;
  }

  tournament.playerMap = tournament.playerMap || new Map<number, number>();
  // ✅ Ensure tracking set exists
  if (!tournament.rankUpdatedPlayers) {
    tournament.rankUpdatedPlayers = new Set<number>();
  }

  // ✅ Filter out players whose rank was already updated
  const updates = tournament.placements
    .filter((p) => {
      const userId = typeof p?.clientId === "number" ? p.clientId : null;
      return userId !== null && !tournament.rankUpdatedPlayers?.has(userId);
    })
    .map(async (p: PlacementEntry) => {
      const userId =
        typeof p?.clientId === "number"
          ? p.clientId
          : typeof p?.playerId === "number"
            ? p.playerId
            : null;
      const rank =
        typeof p?.rank === "number"
          ? p.rank
          : typeof p?.position === "number"
            ? p.position
            : null;
      if (userId == null || rank == null) {
        console.warn(
          `[tournament player database] skip invalid placement entry`,
          p,
        );
        return;
      }

      const tournamentPlayerId = tournament.playerMap?.get(userId);
      if (!tournamentPlayerId) {
        console.warn(
          `[tournament player database] no tournamentPlayerId for user ${userId} (tournament ${tournamentId})`,
        );
        return;
      }

      try {
        console.log(
          `[tournament player database] update ranking: tournamentPlayerId=${tournamentPlayerId}, rank=${rank}`,
        );
        const tournamentPlayerDb = await updateTournamentPlayerRanking(
          rank,
          tournamentPlayerId,
        );
        if (tournamentPlayerDb.success) {
          // ✅ Mark this player as ranked
          tournament.rankUpdatedPlayers?.add(userId);
          console.log(
            `[tournament player database] updated player ranking in DB:`,
            tournamentPlayerDb.data,
          );
        } else {
          console.warn(
            `[tournament player database] failed to update player ranking in DB:`,
            tournamentPlayerDb.error,
          );
        }
        return tournamentPlayerDb;
      } catch (err) {
        console.error(
          "[tournament player database] failed updating player ranking:",
          err,
        );
      }
    });

  await Promise.all(updates);
}
