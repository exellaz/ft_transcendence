import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { generateRoomId } from "../room/room";
import { Prisma, TournamentPlayer, TournamentStatus } from "@prisma/client";
import { ok } from "src/utils/response";
import { TournamentLobby } from "src/types/interface";
import {
  getUserTournamentHistorySchema,
  getUserTournamentStatsSchema,
} from "./tournament.schema";
import { authenticate } from "src/plugins/authenticate";

export const tournaments = new Map<number, TournamentLobby>();

export function generateTournamentId(): number {
  return parseInt("111" + generateRoomId());
}

export default async function tournamentRoutes(app: FastifyInstance) {
  // POST /create-tournament - create a new tournament
  app.post(
    "/create-tournament",
    { preHandler: authenticate },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { name } = req.body as { name: string };

      if (typeof name !== "string" || name.trim() === "") {
        return reply.status(400).send({ error: "Invalid tournament name" });
      }

      const tournamentId = generateTournamentId();

      const tournament: TournamentLobby = {
        id: tournamentId,
        name,
        players: [],
        lock: false,
        stage: "QF",
        countdownTimer: undefined,
        countdownRemaining: undefined,
        maxPlayer: 8, //? change max players for testing
      };

      tournaments.set(tournamentId, tournament);

      console.log(
        `Tournament created: ${name} (${tournamentId}): `,
        tournament,
      ); ////debug

      const res = {
        id: tournamentId,
        name,
        players: tournament.players,
        lock: tournament.lock,
        stage: tournament.stage,
        maxPlayer: tournament.maxPlayer,
      };

      return res;
    },
  );

  // POST /create-next-tournament - create a new tournament for next stage
  app.post(
    "/create-next-tournament",
    { preHandler: authenticate },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { stage, parentId, tournamentDb } = req.body as {
        stage: string;
        parentId?: number;
        tournamentDb?: { id: number; status: string; createdAt: Date } | null;
      };

      if (typeof stage !== "string" || stage.trim() === "") {
        return reply.status(400).send({ error: "Invalid tournament stage" });
      }

      //if parent id provide, return existing next tournament if already created
      if (typeof parentId === "number") {
        const parent = tournaments.get(parentId);
        if (parent && parent.nextTournamentId) {
          const existing = tournaments.get(parent.nextTournamentId);
          if (existing) {
            const res = {
              id: existing.id,
              name: existing.name,
              players: existing.players,
              lock: existing.lock,
              stage: existing.stage,
              maxPlayer: existing.maxPlayer,
              tournamentDb: tournamentDb,
              allowedPlayers: Array.from(existing.allowedPlayers || []),
            };
            console.log(
              `[create-next-tournament] Reusing existing tournament: ${existing.id} for parent ${parentId}`,
              `Expected players: ${res.allowedPlayers.join(", ")}`,
            ); ////debug
            return res;
          }
        }
      }

      const tournamentId = generateTournamentId();

      const tournament: TournamentLobby = {
        id: tournamentId,
        name: `Tournament ${tournamentId}`,
        players: [],
        lock: false,
        stage: stage as "SF" | "F",
        countdownTimer: undefined,
        countdownRemaining: undefined,
        maxPlayer: stage === "SF" ? 4 : 2,
        tournamentDb: tournamentDb || null,
      };

      tournaments.set(tournamentId, tournament);

      //link back to parent tournament if provided
      if (typeof parentId === "number") {
        const parent = tournaments.get(parentId);
        if (parent) {
          parent.nextTournamentId = tournamentId;
          tournament.parentTournamentId = parentId;
        }
      }

      console.log(`Next tournament created: (${tournamentId}): `, tournament);
      const res = {
        id: tournamentId,
        name: tournament.name,
        players: tournament.players,
        lock: tournament.lock,
        stage: tournament.stage,
        maxPlayer: tournament.maxPlayer,
      };

      return res;
    },
  );

  // GET /list-tournaments - list all tournaments
  app.get("/list-tournaments", async () => {
    const response = Array.from(tournaments.values()).map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      players: tournament.players,
      lock: tournament.lock,
      stage: tournament.stage,
      maxPlayer: tournament.maxPlayer,
    }));
    return response;
  });

  // GET /tournament/:tournamentId - get a tournament details and join
  app.get(
    "/tournament/:tournamentId",
    async (
      req: FastifyRequest<{ Params: { tournamentId: string } }>,
      reply: FastifyReply,
    ) => {
      const tournamentId = parseInt(req.params.tournamentId);

      const tournament = tournaments.get(tournamentId);
      if (!tournament) {
        return reply.status(404).send({ error: "Tournament not found" });
      }

      return {
        id: tournament.id,
        name: tournament.name,
        players: tournament.players.length,
        maxPlayer: tournament.maxPlayer,
        stage: tournament.stage,
      };
    },
  );

  // GET /users/:id/tournament-history  - tournament history + matches
  app.get(
    "/users/:id/tournament-history",
    { schema: getUserTournamentHistorySchema, preHandler: authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      const userId = Number(id);

      // reuseable include object for tournament history
      const tournamentHistoryInclude = {
        tournament: true,
        matchesAsP1: {
          include: {
            player1: { include: { user: { select: { username: true } } } },
            player2: { include: { user: { select: { username: true } } } },
          },
        },
        matchesAsP2: {
          include: {
            player1: { include: { user: { select: { username: true } } } },
            player2: { include: { user: { select: { username: true } } } },
          },
        },
      } satisfies Prisma.TournamentPlayerInclude;

      type TournamentHistory = Prisma.TournamentPlayerGetPayload<{
        include: typeof tournamentHistoryInclude;
      }>;

      const tournaments: TournamentHistory[] =
        await app.db.tournamentPlayer.findMany({
          where: {
            userId: userId,
            tournament: { status: "COMPLETED" },
          },
          include: tournamentHistoryInclude,
        });

      const formatted = tournaments.map((tp) => {
        const matches = [...tp.matchesAsP1, ...tp.matchesAsP2].map((m) => {
          const isPlayer1 = m.player1Id === tp.id;
          const opponent = isPlayer1 ? m.player2 : m.player1;

          const myScore = isPlayer1 ? m.player1Score : m.player2Score;
          const opponentScore = isPlayer1 ? m.player2Score : m.player1Score;
          const result = m.winnerId === tp.id ? "win" : "lose";

          return {
            round: m.round,
            opponentUsername: opponent.user.username,
            score: `${myScore}-${opponentScore}`,
            result,
          };
        });

        return {
          tournamentId: tp.tournamentId,
          date: tp.tournament.createdAt.toISOString().split("T")[0],
          ranking: tp.ranking,
          matches,
        };
      });

      return ok(formatted);
    },
  );

  // GET /users/:id/tournament-stats
  app.get(
    "/users/:id/tournament-stats",
    { schema: getUserTournamentStatsSchema, preHandler: authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      const userId = Number(id);

      const completedTournaments: TournamentPlayer[] =
        await app.db.tournamentPlayer.findMany({
          where: {
            userId: userId,
            tournament: { status: TournamentStatus.COMPLETED },
          },
          select: { ranking: true },
        });

      const rankings = completedTournaments.map((t) => t.ranking);

      // use prisma to get average ranking
      const stats = await app.db.tournamentPlayer.aggregate({
        _avg: { ranking: true },
        where: {
          userId: userId,
          tournament: { status: TournamentStatus.COMPLETED },
        },
      });

      const tournamentStats = {
        firstPlace: rankings.filter((r) => r === 1).length,
        secondPlace: rankings.filter((r) => r === 2).length,
        thirdPlace: rankings.filter((r) => r === 3).length,
        completedTournaments: rankings.length,
        averageRanking: stats._avg.ranking, // if user hasn't join tournaments, avgRanking = null
      };

      return ok(tournamentStats);
    },
  );
}
