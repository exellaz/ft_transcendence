import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { generateRoomId } from "../room/room";
import { TournamentPlayer } from "./tournament.ws";

export interface tournament {
  id: number;
  name: string;
  players: TournamentPlayer[];
  started: boolean;
  stage: "quarterfinals" | "semifinals" | "finals";
  maxPlayer: number;
}

export const tournaments = new Map<number, tournament>();

function generateTournamentId(): number {
  return parseInt("9" + generateRoomId());
}

export default async function tournamentRoutes(app: FastifyInstance) {
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

  app.get("/tournament/:tournamentId", async (
    req: FastifyRequest<{ Params: { tournamentId: string } }>,
    reply: FastifyReply
  ) => {
    const tournamentId = parseInt(req.params.tournamentId);
    const { id, username, spriteUrl } = req.body as TournamentPlayer;

    const tournament = tournaments.get(tournamentId);
    if (!tournament) {
      return reply.status(404).send({ error: "Tournament not found" });
    }
    if (tournament.players.length >= tournament.maxPlayer) {
        return reply.status(400).send({ error: "Tournament is full" });
    }

    const alreadyJoined = tournament.players.find((p: TournamentPlayer) => p.id === id);
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
}
