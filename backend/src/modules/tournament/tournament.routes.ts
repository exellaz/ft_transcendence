import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { generateRoomId } from "../room/room";
import { TournamentPlayer } from "@prisma/client";
import { ok } from "src/utils/response";

interface tournament {
  id: number;
  name: string;
  stage: "waiting" | "in-progress" | "completed";
  players: number[]; // array of player IDs
  maxPlayer: number;
  started: boolean;
}

const tournaments = new Map<number, tournament>();

function generateTournamentId(): number {
  return parseInt("9" + generateRoomId());
}

export default async function tournamentRoutes(app: FastifyInstance) {
  app.post("/create-tournament", async (req, reply) => {
    const body: any = req.body;

    const { name } = body as { name: string };

    if (typeof name !== "string" || name.trim() === "") {
      return reply.status(400).send({ error: "Invalid tournament name" });
    }

    const tournamentId = generateTournamentId();

    const tournament: tournament = {
      id: tournamentId,
      name,
      stage: "waiting",
      players: [],
      maxPlayer: 8,
      started: false,
    };

    tournaments.set(tournamentId, tournament);

    console.log(`Tournament created: ${name} (${tournamentId})`);

    const res = {
      id: tournamentId,
      name,
      stage: tournament.stage,
      players: tournament.players.length,
      maxPlayer: tournament.maxPlayer,
      started: tournament.started,
    };

    return res;
  });

  app.get("/tournaments", async () => {
    const response = Array.from(tournaments.values()).map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      stage: tournament.stage,
      players: tournament.players.length,
      maxPlayer: tournament.maxPlayer,
      started: tournament.started,
    }));
    return response;
  });

  // GET /users/:id/tournament-history  - tournament history + matches
  // app.get("/users/:id/tournament-history", async (request, response) => {
  //   const { id } = request.params as { id: string };
  //   const userId = Number(id);

  //   const players: TournamentPlayer[] = await app.db.tournamentPlayer.findMany({
  //     where: {
  //       userId: userId,
  //       tournament: { status: 'COMPLETED' },
  //     }
  //   });

    
    

  // });
  

  // GET /users/:id/tournament-stats
  app.get("/users/:id/tournament-stats", async (request, response) => {
    const { id } = request.params as { id: string };
    const userId = Number(id);

    const completedTournaments: TournamentPlayer[] = await app.db.tournamentPlayer.findMany({
      where: {
        userId: userId,
        tournament: { status: 'COMPLETED' },
      },
      select: { ranking: true },
    });

    const rankings = completedTournaments.map(t => t.ranking);

    // use prisma to get average ranking
    const stats = await app.db.tournamentPlayer.aggregate({
      _avg: { ranking: true },
      where: {
        userId: userId,
        tournament: { status: 'COMPLETED' },
      },
    });

    const tournamentStats = {
      firstPlace: rankings.filter(r => r === 1).length,
      secondPlace: rankings.filter(r => r === 2).length,
      thirdPlace: rankings.filter(r => r === 3).length,
      completedTournaments: rankings.length,
      averageRanking: stats._avg.ranking // if user hasn't join tournaments, avgRanking = null
    };

    return ok(tournamentStats);
  });

}
