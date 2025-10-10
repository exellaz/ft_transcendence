import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { generateRoomId } from "../room/room";

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
  app.post("/create-quater-tournament", async (req: FastifyRequest, reply: FastifyReply) => {
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

  app.get("/list-tournaments", async () => {
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
}
