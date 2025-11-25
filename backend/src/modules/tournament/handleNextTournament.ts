import { tournaments, generateTournamentId } from "./tournament.routes";
import { startLobbyTimeout, startTournamentCountdown } from "./tournament";
import { TournamentLobby, TournamentPlayerWs } from "../../types/interface";
import {
  createTournamentPlayer,
  updateTournamentPlayerRanking,
  updateTournamentStatus,
} from "./tournament.service";

/**
 * @brief Add a winner to the next tournament's expected players list
 * @param currentTournamentId - The ID of the current tournament
 * @param winnerId - The ID of the winner to add to next tournament
 */
export function addWinnerToNextTournament(
  currentTournamentId: number,
  winnerId: number,
) {
  const currentTournament = tournaments.get(currentTournamentId);
  if (!currentTournament) return;

  // Get or create the next tournament
  const nextTournamentId = currentTournament.nextTournamentId;
  if (!nextTournamentId) {
    console.log(
      `[Tournament ${currentTournamentId}] No next tournament created yet for winner ${winnerId}`,
    );
    return;
  }

  const nextTournament = tournaments.get(nextTournamentId);
  if (!nextTournament) {
    console.warn(
      `[Tournament ${currentTournamentId}] Next tournament ${nextTournamentId} not found`,
    );
    return;
  }

  // Initialize allowedPlayers and nextStageExpectedPlayers if needed
  if (!nextTournament.allowedPlayers) {
    nextTournament.allowedPlayers = new Set<number>();
  }
  if (!nextTournament.nextStageExpectedPlayers) {
    nextTournament.nextStageExpectedPlayers = [];
  }

  // initialize expectedPlayerInfo map if needed
  if (!nextTournament.expectedPlayerInfo) {
    nextTournament.expectedPlayerInfo = new Map();
  }

  // Find winner's info from current tournament
  const winnerInfo = currentTournament.players.find((p) => p.id === winnerId);
  if (winnerInfo) {
    nextTournament.expectedPlayerInfo.set(winnerId, {
      id: winnerInfo.id,
      username: winnerInfo.username,
      spriteUrl: winnerInfo.spriteUrl,
    });
    console.log(
      `[Tournament ${nextTournamentId}] Stored info for winner ${winnerId}: ${winnerInfo.username}`,
    );
  }

  // Add winner to allowed players
  nextTournament.allowedPlayers.add(winnerId);
  if (!nextTournament.nextStageExpectedPlayers.includes(winnerId)) {
    nextTournament.nextStageExpectedPlayers.push(winnerId);
  }

  console.log(
    `[Tournament ${nextTournamentId}] Added winner ${winnerId} to expected players. Current: ${Array.from(nextTournament.allowedPlayers).join(", ")}`,
  );

  // only start countdown when collected all winners
  const allAllowedPlayer =
    nextTournament.allowedPlayers.size === nextTournament.maxPlayer;
  const timeoutNotStarted =
    !nextTournament.lobbyTimeout && !nextTournament.lobbyTimeoutStarted;
  if (allAllowedPlayer && timeoutNotStarted) {
    const expectedPlayerCount = nextTournament.maxPlayer;
    const timeoutSeconds = 30;
    nextTournament.lobbyTimeoutStarted = true; // Mark that timeout has started
    console.log(
      `[Tournament ${nextTournamentId}] collected all winners. Starting ${timeoutSeconds}s timeout for ${expectedPlayerCount} players`,
    );
    startLobbyTimeout(nextTournamentId, expectedPlayerCount, timeoutSeconds);
  }
}

/**
 * @brief Handle special cases in finals when 0, 1, or 2 players show up
 */
export async function handleFinalSpecialCases(
  tournamentId: number,
  tournament: TournamentLobby,
  currentPlayerCount: number,
) {
  const expectedPlayers = Array.from(tournament.allowedPlayers || []);
  const currentPlayerIds = tournament.players.map((p) => p.id);
  const noShowPlayers = expectedPlayers.filter(
    (id) => !currentPlayerIds.includes(id),
  );

  console.log(
    `[Tournament ${tournamentId}] Finals special case: ${currentPlayerCount} players showed up`,
  );

  // ✅ Initialize playerMap if needed
  if (!tournament.playerMap) {
    tournament.playerMap = new Map();
  }

  if (!tournament.rankUpdatedPlayers) {
    tournament.rankUpdatedPlayers = new Set();
  }

  // ✅ CASE 1: No players showed up - assign random ranks 1, 2 to no-shows
  if (currentPlayerCount === 0) {
    console.log(
      `[Tournament ${tournamentId}] Finals: No players showed up. Assigning random ranks 1-2.`,
    );

    const dummyPlayers = tournament.players.filter((p) =>
      tournament.dummyPlayers?.has(p.id),
    );

    const AFKRanks = [1, 2];
    const playersToRank = [...noShowPlayers, ...dummyPlayers.map((p) => p.id)];

    for (let i = 0; i < playersToRank.length && i < AFKRanks.length; i++) {
      const playerId = playersToRank[i];
      const rank = AFKRanks[i];
      if (!playerId || !rank) continue;

      //  console.log(`[Tournament ${tournamentId}] Processing no-show player ${playerId} for rank ${rank}`); ////debug

      // Create tournament player record if needed
      let tournamentPlayerId = tournament.playerMap.get(playerId);

      if (!tournamentPlayerId && tournament.tournamentDb) {
        //console.log(`[Tournament ${tournamentId}] Creating tournament player record for no-show player ${playerId}`); ////debug

        const createResult = await createTournamentPlayer({
          tournamentId: tournament.tournamentDb.id,
          userId: playerId,
          ranking: 0,
        });

        if (createResult.success && createResult.data) {
          tournamentPlayerId = createResult.data.id;
          if (!tournamentPlayerId) return;
          tournament.playerMap.set(playerId, tournamentPlayerId);
        } else {
          console.error(
            `[Tournament ${tournamentId}] ❌ Failed to create tournament player for AFK ${playerId}:`,
            createResult.error,
          );
          continue;
        }
      }

      // Update rank
      if (tournamentPlayerId) {
        //console.log(`[Tournament ${tournamentId}] Updating rank ${rank} for tournament player ID ${tournamentPlayerId}`); ////debug
        const updateResult = await updateTournamentPlayerRanking(
          rank,
          tournamentPlayerId,
        );
        if (updateResult.success) {
          tournament.rankUpdatedPlayers.add(playerId);
          console.log(
            `[Tournament ${tournamentId}] ✅ Successfully updated AFK player ranking`,
            updateResult.data,
          );
        } else {
          console.error(
            `[Tournament ${tournamentId}] ❌ Failed to update rank:`,
            updateResult.error,
          );
        }
      }
    }

    if (tournament.tournamentDb) {
      const updateResult = await updateTournamentStatus(
        "COMPLETED",
        tournament.tournamentDb.id,
      );
      if (updateResult.success) {
        console.log(
          `[Tournament ${tournamentId}] Tournament status updated to COMPLETED`,
        );
      } else {
        console.error(
          `[Tournament ${tournamentId}] Failed to update status:`,
          updateResult.error,
        );
      }
    }

    console.log(
      `[Tournament ${tournamentId}] Finals completed with no players`,
    );

    // Clean up
    tournament.rankUpdatedPlayers.clear();
    tournaments.delete(tournamentId);
    return;
  }

  // ✅ CASE 2: Only 1 player showed up - they get rank 1, no-show gets rank 2
  if (currentPlayerCount === 1) {
    const winner = tournament.players[0];
    if (!winner) {
      console.error(
        `[Tournament ${tournamentId}] No players found despite count 1`,
      );
      return;
    }

    console.log(
      `[Tournament ${tournamentId}] Finals: Only 1 player (${winner.username}) showed up. Awarding 1st place.`,
    );

    // Ensure winner has tournament player record
    let winnerTournamentPlayerId = tournament.playerMap.get(winner.id);
    if (!winnerTournamentPlayerId && tournament.tournamentDb) {
      //  console.log(`[Tournament ${tournamentId}] Creating tournament player record for winner ${winner.id}`); ////debug
      const createResult = await createTournamentPlayer({
        tournamentId: tournament.tournamentDb.id,
        userId: winner.id,
        ranking: 0,
      });
      if (createResult.success && createResult.data) {
        winnerTournamentPlayerId = createResult.data.id;
        if (!winnerTournamentPlayerId) return;
        tournament.playerMap.set(winner.id, winnerTournamentPlayerId);
      } else {
        console.error(
          `[Tournament ${tournamentId}] Failed to create tournament player:`,
          createResult.error,
        );
      }
    }

    // Update winner's rank
    if (winnerTournamentPlayerId) {
      const updateResult = await updateTournamentPlayerRanking(
        1,
        winnerTournamentPlayerId,
      );
      if (updateResult.success) {
        tournament.rankUpdatedPlayers.add(winner.id);
        console.log(
          `[Tournament ${tournamentId}] ✅ Successfully updated winner ranking`,
          updateResult.data,
        );
      } else {
        console.error(
          `[Tournament ${tournamentId}] Failed to update winner rank:`,
          updateResult.error,
        );
      }
    }

    const dummyPlayers = tournament.players.filter((p) =>
      tournament.dummyPlayers?.has(p.id),
    );
    const playersToRank = [...noShowPlayers, ...dummyPlayers.map((p) => p.id)];

    // Assign rank 2 to no-show player
    if (playersToRank.length > 0) {
      const noShowPlayer = playersToRank[0];
      if (noShowPlayer) {
        //console.log(`[Tournament ${tournamentId}] Processing AFK player ${noShowPlayer} for rank 2`); ////debug

        let tournamentPlayerId = tournament.playerMap.get(noShowPlayer);

        if (!tournamentPlayerId && tournament.tournamentDb) {
          const createResult = await createTournamentPlayer({
            tournamentId: tournament.tournamentDb.id,
            userId: noShowPlayer,
            ranking: 0,
          });

          if (createResult.success && createResult.data) {
            tournamentPlayerId = createResult.data.id;
            if (!tournamentPlayerId) return;
            tournament.playerMap.set(noShowPlayer, tournamentPlayerId);
          } else {
            console.error(
              `[Tournament ${tournamentId}] ❌ Failed to create tournament player:`,
              createResult.error,
            );
          }
        }

        if (tournamentPlayerId) {
          const updateResult = await updateTournamentPlayerRanking(
            2,
            tournamentPlayerId,
          );
          if (updateResult.success) {
            tournament.rankUpdatedPlayers.add(noShowPlayer);
            console.log(
              `[Tournament ${tournamentId}] ✅ Successfully updated AFK player ranking`,
              updateResult.data,
            );
          } else {
            console.error(
              `[Tournament ${tournamentId}] ❌ Failed to update rank:`,
              updateResult.error,
            );
          }
        }
      }
    }

    if (tournament.tournamentDb) {
      const updateResult = await updateTournamentStatus(
        "COMPLETED",
        tournament.tournamentDb.id,
      );
      if (updateResult.success) {
        console.log(
          `[Tournament ${tournamentId}] Tournament status updated to COMPLETED`,
        );
      } else {
        console.error(
          `[Tournament ${tournamentId}] Failed to update status:`,
          updateResult.error,
        );
      }
    }

    // Send winner to results page
    if (tournament.clientMap) {
      for (const [ws, info] of tournament.clientMap.entries()) {
        if (info.playerId === winner.id && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                type: "FinalEnded",
                winnerRank: 1,
                clientId: winner.id,
                lastTournamentId: tournamentId,
                tournamentDb: tournament.tournamentDb?.id,
              }),
            );
          } catch (err) {
            console.error(
              `[Tournament ${tournamentId}] Failed to send message:`,
              err,
            );
          }
        }
      }
    }

    console.log(`[Tournament ${tournamentId}] Finals completed with 1 player`);

    // Clean up
    tournament.rankUpdatedPlayers.clear();
    tournaments.delete(tournamentId);
    return;
  }
}

/**
 * @brief Handle semi-final special cases where players no-show
 */
export async function handleSemiFinalSpecialCases(
  tournamentId: number,
  tournament: TournamentLobby,
  currentPlayerCount: number,
  expectedPlayerCount: number,
) {
  const expectedPlayers = Array.from(tournament.allowedPlayers || []);
  const currentPlayerIds = tournament.players.map((p) => p.id);
  const noShowPlayers = expectedPlayers.filter(
    (id) => !currentPlayerIds.includes(id),
  );

  console.log(
    `[Tournament ${tournamentId}] Semi-final special case: ${currentPlayerCount} players showed up`,
  );

  // ✅ Initialize playerMap if needed
  if (!tournament.playerMap) {
    tournament.playerMap = new Map();
  }

  // ✅ CASE 1: 0 player showed up - assign random ranks 1-4 to AFK player
  if (currentPlayerCount === 0) {
    console.log(
      `[Tournament ${tournamentId}] No players showed up in semi-finals. Assigning random ranks 1-4 to no-shows.`,
    );

    const dummyPlayers = tournament.players.filter((p) =>
      tournament.dummyPlayers?.has(p.id),
    );

    const AFKRanks = [1, 2, 3, 4];
    const playersToRank = [...noShowPlayers, ...dummyPlayers.map((p) => p.id)];

    for (let i = 0; i < playersToRank.length && i < AFKRanks.length; i++) {
      const playerId = playersToRank[i];
      const rank = AFKRanks[i];
      if (!playerId || !rank) continue;

      //  console.log(`[Tournament ${tournamentId}] Processing AFK player ${playerId} for rank ${rank}`); ////debug

      // Check if tournament player record exists
      let tournamentPlayerId = tournament.playerMap.get(playerId);

      // If not, create it
      if (!tournamentPlayerId && tournament.tournamentDb) {
        const createResult = await createTournamentPlayer({
          tournamentId: tournament.tournamentDb.id,
          userId: playerId,
          ranking: 0,
        });

        if (createResult.success && createResult.data) {
          tournamentPlayerId = createResult.data.id;
          if (!tournamentPlayerId) return;
          tournament.playerMap.set(playerId, tournamentPlayerId);
        } else {
          console.error(
            `[Tournament ${tournamentId}] ❌ Failed to create tournament player for AFK ${playerId}:`,
            createResult.error,
          );
          continue;
        }
      }

      // Update the rank
      if (tournamentPlayerId) {
        console.log(
          `[Tournament ${tournamentId}] Updating rank ${rank} for tournament player ID ${tournamentPlayerId} (user ${playerId})`,
        );
        const updateResult = await updateTournamentPlayerRanking(
          rank,
          tournamentPlayerId,
        );
        if (updateResult.success) {
          tournament.rankUpdatedPlayers?.add(playerId);
          console.log(
            `[Tournament ${tournamentId}] ✅ Successfully updated AFK player ranking`,
            updateResult.data,
          );
        } else {
          console.error(
            `[Tournament ${tournamentId}] ❌ Failed to update rank for player ${playerId}:`,
            updateResult.error,
          );
        }
      }
    }

    if (tournament.tournamentDb) {
      const updateResult = await updateTournamentStatus(
        "COMPLETED",
        tournament.tournamentDb.id,
      );
      if (updateResult.success) {
        console.log(
          `[Tournament ${tournamentId}] Tournament status updated to COMPLETED: `,
          updateResult.data,
        );
      } else {
        console.error(
          `[Tournament ${tournamentId}] Failed to update tournament status:`,
          updateResult.error,
        );
      }
    }
  }

  // ✅ CASE 1: Only 1 player showed up - they win, others get random ranks 2-4
  if (currentPlayerCount === 1) {
    const winner = tournament.players[0];
    if (!winner) {
      console.error(
        `[Tournament ${tournamentId}] No players found despite count 1`,
      );
      return;
    }

    console.log(
      `[Tournament ${tournamentId}] Only 1 player (${winner.username}) in semi-finals. Awarding 1st place.`,
    );

    // ✅ Ensure winner has tournament player record
    let winnerTournamentPlayerId = tournament.playerMap.get(winner.id);
    if (!winnerTournamentPlayerId && tournament.tournamentDb) {
      //  console.log(`[Tournament ${tournamentId}] Creating tournament player record for winner ${winner.id}`); ////debug
      const createResult = await createTournamentPlayer({
        tournamentId: tournament.tournamentDb.id,
        userId: winner.id,
        ranking: 0,
      });
      if (createResult.success && createResult.data) {
        winnerTournamentPlayerId = createResult.data.id;
        if (!winnerTournamentPlayerId) return;
        tournament.playerMap.set(winner.id, winnerTournamentPlayerId);
      } else {
        console.error(
          `[Tournament ${tournamentId}] Failed to create tournament player for winner:`,
          createResult.error,
        );
      }
    }

    // Update winner's rank
    if (winnerTournamentPlayerId) {
      const updateResult = await updateTournamentPlayerRanking(
        1,
        winnerTournamentPlayerId,
      );
      if (updateResult.success) {
        tournament.rankUpdatedPlayers?.add(winner.id);
        console.log(
          `[Tournament ${tournamentId}] ✅ Successfully updated winner ranking`,
          updateResult.data,
        );
      } else {
        console.error(
          `[Tournament ${tournamentId}] Failed to update winner rank:`,
          updateResult.error,
        );
      }
    }

    //Get dummy players for ranking
    const dummyPlayers = tournament.players.filter((p) =>
      tournament.dummyPlayers?.has(p.id),
    );

    //get random ranks 2, 3, 4 for afk player
    const AFKRanks = [2, 3, 4];
    const playersToRank = [...noShowPlayers, ...dummyPlayers.map((p) => p.id)];

    for (let i = 0; i < playersToRank.length && i < AFKRanks.length; i++) {
      const playerId = playersToRank[i];
      const rank = AFKRanks[i];
      if (!playerId || !rank) continue;

      //  console.log(`[Tournament ${tournamentId}] Processing AFK player ${playerId} for rank ${rank}`); ////debug

      // Check if tournament player record exists
      let tournamentPlayerId = tournament.playerMap.get(playerId);

      // If not, create it
      if (!tournamentPlayerId && tournament.tournamentDb) {
        const createResult = await createTournamentPlayer({
          tournamentId: tournament.tournamentDb.id,
          userId: playerId,
          ranking: 0,
        });

        if (createResult.success && createResult.data) {
          tournamentPlayerId = createResult.data.id;
          if (!tournamentPlayerId) return;
          tournament.playerMap.set(playerId, tournamentPlayerId);
        } else {
          console.error(
            `[Tournament ${tournamentId}] ❌ Failed to create tournament player for AFK ${playerId}:`,
            createResult.error,
          );
          continue;
        }
      } else if (tournamentPlayerId) {
        console.log(
          `[Tournament ${tournamentId}] Tournament player record already exists: ${tournamentPlayerId} for user ${playerId}`,
        );
      }

      // Update the rank
      if (tournamentPlayerId) {
        //console.log(`[Tournament ${tournamentId}] Updating rank ${rank} for tournament player ID ${tournamentPlayerId} (user ${playerId})`); ////debug
        const updateResult = await updateTournamentPlayerRanking(
          rank,
          tournamentPlayerId,
        );
        if (updateResult.success) {
          tournament.rankUpdatedPlayers?.add(playerId);
          console.log(
            `[Tournament ${tournamentId}] ✅ Successfully updated AFK player ranking`,
            updateResult.data,
          );
        } else {
          console.error(
            `[Tournament ${tournamentId}] ❌ Failed to update rank for player ${playerId}:`,
            updateResult.error,
          );
        }
      } else {
        console.error(
          `[Tournament ${tournamentId}] ❌ No tournament player ID available for user ${playerId}`,
        );
      }
    }

    if (tournament.tournamentDb) {
      const updateResult = await updateTournamentStatus(
        "COMPLETED",
        tournament.tournamentDb.id,
      );
      if (updateResult.success) {
        console.log(
          `[Tournament ${tournamentId}] Tournament status updated to COMPLETED: `,
          updateResult.data,
        );
      } else {
        console.error(
          `[Tournament ${tournamentId}] Failed to update tournament status:`,
          updateResult.error,
        );
      }
    }

    // ✅ Send winner to results page
    if (tournament.clientMap) {
      for (const [ws, info] of tournament.clientMap.entries()) {
        if (info.playerId === winner.id && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                type: "semiFinalEnd",
                winnerRank: 1,
                clientId: winner.id,
                lastTournamentId: tournamentId,
                tournamentDb: tournament.tournamentDb?.id,
              }),
            );
            console.log(
              `[Tournament ${tournamentId}] Sent tournament end message to winner ${winner.id}`,
            );
          } catch (err) {
            console.error(
              `[Tournament ${tournamentId}] Failed to send message to winner:`,
              err,
            );
          }
        }
      }
    }

    // Clean up
    tournament.rankUpdatedPlayers?.clear();
    tournaments.delete(tournamentId);
    return;
  }

  // ✅ CASE 2: Only 2 players showed up - promote to finals, others get random ranks 3-4
  if (currentPlayerCount === 2) {
    console.log(
      `[Tournament ${tournamentId}] Only 2 players in semi-finals. Promoting to finals.`,
    );

    // ✅ Ensure both players have tournament player records
    for (const player of tournament.players) {
      let playerTournamentId = tournament.playerMap.get(player.id);

      if (!playerTournamentId && tournament.tournamentDb) {
        //console.log(`[Tournament ${tournamentId}] Creating tournament player record for ${player.username}`); ////debug
        const createResult = await createTournamentPlayer({
          tournamentId: tournament.tournamentDb.id,
          userId: player.id,
          ranking: 0,
        });

        if (createResult.success && createResult.data) {
          playerTournamentId = createResult.data.id;
          if (!playerTournamentId) return;
          tournament.playerMap.set(player.id, playerTournamentId);
        } else {
          console.error(
            `[Tournament ${tournamentId}] Failed to create tournament player for ${player.id}:`,
            createResult.error,
          );
        }
      }
    }

    // Check if next tournament already exists, if not create it
    let finalTournamentId = tournament.nextTournamentId;

    if (!finalTournamentId) {
      // Create finals tournament manually
      finalTournamentId = generateTournamentId();

      // ✅ Create broadcast function for finals
      const finalsBroadcast = (msg: string) => {
        const finalTournament = tournaments.get(finalTournamentId!);
        if (!finalTournament?.clientMap) return;

        for (const [ws, info] of finalTournament.clientMap.entries()) {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(msg);
            } catch (err) {
              console.error(
                `[Tournament ${finalTournamentId}] Failed to broadcast to player ${info.playerId}:`,
                err,
              );
            }
          }
        }
      };

      // Create finals tournament lobby
      const finalTournament: TournamentLobby = {
        id: finalTournamentId,
        name: `Tournament Finals ${finalTournamentId}`,
        players: [],
        lock: false,
        stage: "F",
        countdownTimer: undefined,
        countdownRemaining: undefined,
        maxPlayer: 2,
        tournamentDb: tournament.tournamentDb,
        allowedPlayers: new Set<number>(),
        nextStageExpectedPlayers: [],
        parentTournamentId: tournamentId,
        expectedPlayerInfo: new Map(),
        clientMap: new Map(),
        playerMap: tournament.playerMap,
        rankUpdatedPlayers: tournament.rankUpdatedPlayers,
        broadcast: finalsBroadcast, // ✅ Set broadcast function
      };

      tournaments.set(finalTournamentId, finalTournament);
      tournament.nextTournamentId = finalTournamentId;

      console.log(
        `[Tournament ${finalTournamentId}] Created finals tournament`,
      );
    }

    const finalTournament = tournaments.get(finalTournamentId);
    if (!finalTournament) {
      console.error(
        `[Tournament ${tournamentId}] Failed to get finals tournament`,
      );
      return;
    }

    //Only promote REAL players (not dummies) to finals
    const realPlayers = tournament.players.filter(
      (p) => !tournament.dummyPlayers?.has(p.id),
    );

    for (const player of realPlayers) {
      addWinnerToNextTournament(tournamentId, player.id);
      console.log(
        `[Tournament ${tournamentId}] Promoted ${player.username} to finals`,
      );
    }

    //Get dummy players for ranking
    const dummyPlayers = tournament.players.filter((p) =>
      tournament.dummyPlayers?.has(p.id),
    );

    // No-shows get random ranks 3, 4
    const noShowRanks = [3, 4];
    const playersToRank = [...noShowPlayers, ...dummyPlayers.map((p) => p.id)];

    for (let i = 0; i < playersToRank.length && i < noShowRanks.length; i++) {
      const playerId = playersToRank[i];
      const rank = noShowRanks[i];
      if (!playerId || !rank) continue;

      //  console.log(`[Tournament ${tournamentId}] Processing AFK player ${playerId} for rank ${rank}`); ////debug

      // Check if tournament player record exists
      let tournamentPlayerId = tournament.playerMap.get(playerId);

      // If not, create it
      if (!tournamentPlayerId && tournament.tournamentDb) {
        //console.log(`[Tournament ${tournamentId}] Creating tournament player record for AFK player ${playerId}`); ////debug

        const createResult = await createTournamentPlayer({
          tournamentId: tournament.tournamentDb.id,
          userId: playerId,
          ranking: 0,
        });

        if (createResult.success && createResult.data) {
          tournamentPlayerId = createResult.data.id;
          if (!tournamentPlayerId) return;
          tournament.playerMap.set(playerId, tournamentPlayerId);
        } else {
          console.error(
            `[Tournament ${tournamentId}] ❌ Failed to create tournament player for AFK player ${playerId}:`,
            createResult.error,
          );
          continue;
        }
      }

      // Update the rank
      if (tournamentPlayerId) {
        //console.log(`[Tournament ${tournamentId}] Updating rank ${rank} for tournament player ID ${tournamentPlayerId} (user ${playerId})`);
        const updateResult = await updateTournamentPlayerRanking(
          rank,
          tournamentPlayerId,
        );
        if (updateResult.success) {
          tournament.rankUpdatedPlayers?.add(playerId);
          console.log(
            `[Tournament ${tournamentId}] ✅ Successfully updated AFK player ranking`,
            updateResult.data,
          );
        } else {
          console.error(
            `[Tournament ${tournamentId}] ❌ Failed to update rank for player ${playerId}:`,
            updateResult.error,
          );
        }
      }
    }

    // ✅ Transfer WebSocket connections and notify players
    if (tournament.clientMap) {
      for (const [ws, info] of tournament.clientMap.entries()) {
        // Only transfer players who advanced
        const playerAdvanced = tournament.players.some(
          (p) => p.id === info.playerId,
        );

        if (playerAdvanced && ws.readyState === WebSocket.OPEN) {
          console.log(
            `[Tournament ${tournamentId}] Transferring player ${info.playerId} to finals`,
          );

          // ✅ Send redirect message to client
          try {
            ws.send(
              JSON.stringify({
                type: "redirectToFinals",
                nextTournamentId: finalTournamentId,
                stage: "F",
                maxPlayer: 2,
                player: {
                  id: info.playerId,
                  username: tournament.players.find(
                    (p) => p.id === info.playerId,
                  )?.username,
                  spriteUrl: tournament.players.find(
                    (p) => p.id === info.playerId,
                  )?.spriteUrl,
                },
              }),
            );
          } catch (err) {
            console.error(
              `[Tournament ${tournamentId}] ❌ Failed to send redirect to player ${info.playerId}:`,
              err,
            );
          }
        }
      }
    }

    console.log(
      `[Tournament ${tournamentId}] Semi-finals completed with 2 players advancing to finals`,
    );

    return;
  }

  // ✅ CASE 3: 3 players showed up - create 1 dummy for matchmaking
  if (currentPlayerCount === 3) {
    console.log(
      `[Tournament ${tournamentId}] 3 players in semi-finals. Creating 1 dummy.`,
    );
    await createDummiesForAFK(tournamentId, tournament, expectedPlayerCount, 1);
    return;
  }
}

/**
 * @brief Create dummy players for AFK
 */
async function createDummiesForAFK(
  tournamentId: number,
  tournament: TournamentLobby,
  expectedPlayerCount: number,
  missingPlayerCount: number,
) {
  const expectedPlayers = Array.from(tournament.allowedPlayers || []);
  const currentPlayerIds = tournament.players.map((p) => p.id);
  const AFKPlayers = expectedPlayers.filter(
    (id) => !currentPlayerIds.includes(id),
  );

  console.log(
    `[Tournament ${tournamentId}] Creating ${missingPlayerCount} dummies for: ${AFKPlayers.join(", ")}`,
  );

  for (const AFKPlayerId of AFKPlayers.slice(0, missingPlayerCount)) {
    let playerInfo = tournament.expectedPlayerInfo?.get(AFKPlayerId);

    if (!playerInfo && tournament.parentTournamentId) {
      const parentTournament = tournaments.get(tournament.parentTournamentId);
      if (parentTournament) {
        const parentPlayer = parentTournament.players.find(
          (p) => p.id === AFKPlayerId,
        );
        if (parentPlayer) {
          playerInfo = {
            id: parentPlayer.id,
            username: parentPlayer.username,
            spriteUrl: parentPlayer.spriteUrl,
          };
        }
      }
    }

    const dummyPlayer: TournamentPlayerWs = {
      id: AFKPlayerId,
      username: playerInfo
        ? `[Forfeited] ${playerInfo.username}`
        : `[Forfeited] Player ${AFKPlayerId}`,
      spriteUrl: playerInfo?.spriteUrl || "/assets/skins/slime/red/idle.png",
      ready: true,
    };

    tournament.players.push(dummyPlayer);

    if (!tournament.dummyPlayers) {
      tournament.dummyPlayers = new Set();
    }
    tournament.dummyPlayers.add(AFKPlayerId);

    console.log(
      `[Tournament ${tournamentId}] ✅ Created dummy: ${dummyPlayer.username}`,
    );
  }

  // Broadcast updated player list
  if (tournament.broadcast) {
    tournament.broadcast(
      JSON.stringify({
        type: "playerJoined",
        players: tournament.players,
      }),
    );
  }

  // Start countdown if lobby is full
  if (
    tournament.players.length === tournament.maxPlayer &&
    tournament.broadcast &&
    tournament.clientMap &&
    !tournament.lock
  ) {
    console.log(
      `[Tournament ${tournamentId}] ✅ Lobby full, starting countdown`,
    );
    startTournamentCountdown(
      tournamentId,
      tournament.broadcast,
      10,
      tournament.clientMap,
    );
  }
}
