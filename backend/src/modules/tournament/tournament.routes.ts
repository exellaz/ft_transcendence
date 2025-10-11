import {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { generateRoomId } from "../room/room";
import { TournamentPlayerWs } from "./tournament.ws";
import { Prisma, TournamentPlayer, TournamentStatus } from "@prisma/client";
import { ok } from "src/utils/response";

export interface tournament {
  id: number;
  name: string;
  players: TournamentPlayerWs[];
  started: boolean;
  stage: "quarterfinals" | "semifinals" | "finals";
  countdownTimer?: NodeJS.Timeout | undefined;
  countdownRemaining?: number | undefined;
  maxPlayer: number;
}

export const tournaments = new Map<number, tournament>();

function generateTournamentId(): number {
  return parseInt("9" + generateRoomId());
}

export default async function tournamentRoutes(app: FastifyInstance) {
  // POST /create-tournament - create a new tournament
  app.post("/create-tournament", async (req: FastifyRequest, reply: FastifyReply) => {
    const { name } = req.body as { name: string };

    if (typeof name !== "string" || name.trim() === "") {
      return reply.status(400).send({ error: "Invalid tournament name" });
    }

    const tournamentId = generateTournamentId();

    const tournament: tournament = {
      id: tournamentId,
      name,
      players: [],
      started: false,
      stage: "quarterfinals",
      countdownTimer: undefined,
      countdownRemaining: undefined,
      maxPlayer: 8,
    };

    tournaments.set(tournamentId, tournament);

    console.log(`Tournament created: ${name} (${tournamentId})`);

    const res = {
      id: tournamentId,
      name,
      players: tournament.players,
      started: tournament.started,
      stage: tournament.stage,
      maxPlayer: tournament.maxPlayer,
    };

    return res;
  });

  // GET /list-tournaments - list all tournaments
  app.get("/list-tournaments", async () => {
    const response = Array.from(tournaments.values()).map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      players: tournament.players,
      started: tournament.started,
      stage: tournament.stage,
      maxPlayer: tournament.maxPlayer,
    }));
    return response;
  });

  // GET /tournament/:tournamentId - get a tournament details and join
  app.get("/tournament/:tournamentId", async (
    req: FastifyRequest<{ Params: { tournamentId: string } }>,
    reply: FastifyReply
  ) => {
    const tournamentId = parseInt(req.params.tournamentId);
    const { id, username, spriteUrl } = req.body as TournamentPlayerWs;

    const tournament = tournaments.get(tournamentId);
    if (!tournament) {
      return reply.status(404).send({ error: "Tournament not found" });
    }
    if (tournament.players.length >= tournament.maxPlayer) {
        return reply.status(400).send({ error: "Tournament is full" });
    }

    const alreadyJoined = tournament.players.find((p: TournamentPlayerWs) => p.id === id);
    if (!alreadyJoined) {
        tournament.players.push({ id, username, spriteUrl, ready: false });
    }


    return {
      id: tournament.id,
      name: tournament.name,
      players: tournament.players.length,
      maxPlayer: tournament.maxPlayer,
      started: tournament.started,
    };
  });

  // GET /users/:id/tournament-history  - tournament history + matches
  app.get("/users/:id/tournament-history", async (request, response) => {
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
  });

  // GET /users/:id/tournament-stats
  app.get("/users/:id/tournament-stats", async (request, response) => {
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
  });
}
