import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { rooms, createRoom, generateRoomId, DEFAULT_SETTING } from "./room.ts";

interface RoomParams {
  roomId: number;
}

export default async function roomRoutes(app: FastifyInstance) {
  // ----------------------- LIST ROOMS -----------------------
  app.get("/rooms", async () => {
    const response = Array.from(rooms.values()).map((room) => ({
      id: room.id,
      name: room.name,
      teamSize: room.teamSize,
      leftPlayers: room.gameState.teams.left.length,
      rightPlayers: room.gameState.teams.right.length,
      gameStarted: room.game.state === 2 ? true : false,
      gameEnded: room.game.state === 3 ? true : false,
      private: room.private,
    }));
    // console.log("responding /rooms: ", response); ////debug
    return response;
  });

  // ----------------------- CREATE ROOM -----------------------
  app.post("/create-room", async (req, reply) => {
    console.log("request /Create-room:", req.body); ////debug

    //assign body parameters to variables
    const { name, teamSize, leaderId, isPrivate } = req.body as {
      name: string;
      teamSize: number;
      leaderId?: number;
      isPrivate?: boolean;
    };

    // Validate required fields
    if (typeof teamSize !== "number" && (teamSize < 1 || teamSize > 5)) {
      return reply
        .code(400)
        .send({ error: "Team size must be a number between 1 and 5" });
    }
    if (typeof name !== "string" || name.trim() === "") {
      return reply.code(400).send({ error: "Room name is required" });
    }
    if (!leaderId || typeof leaderId !== "number") {
      return reply.code(400).send({ error: "Leader ID is required" });
    }
    if (isPrivate === undefined || typeof isPrivate !== "boolean") {
      return reply.code(400).send({ error: "isPrivate flag is required" });
    }

    // Generate a unique room ID
    const roomId = generateRoomId();

    //initialize game setting
    const initialSetting: Partial<typeof DEFAULT_SETTING> = {}; // set default value to initial setting
    initialSetting.ballSpeed = DEFAULT_SETTING.ballSpeed ?? -1;
    initialSetting.ballSize = DEFAULT_SETTING.ballSize ?? -1;
    initialSetting.paddleSpeed = DEFAULT_SETTING.paddleSpeed ?? -1;
    initialSetting.scorePoint = DEFAULT_SETTING.scorePoint ?? -1;
    initialSetting.map = DEFAULT_SETTING.map ?? "unknown map";

    // Create and store the new room
    const room = createRoom(
      roomId,
      name,
      teamSize,
      leaderId,
      isPrivate,
      initialSetting, // 👈 important for frontend
    );

    rooms.set(roomId, room);

    console.log(
      `Player id: ${leaderId} => ${name} (${roomId}) [${isPrivate ? "Private" : "Public"}] created with team size ${teamSize}`,
    );

    // Respond with room details to client
    const response = {
      roomId,
      name,
      teamSize,
      leaderId,
      gameStarted: room.game.state === 2 ? true : false,
      ...(isPrivate ? { leaderId } : {}), // only include leaderId if private
      private: room.private,
      setting: room.setting, // 👈 important for frontend
    };
    return response;
  });

  // ----------------------- UPDATE GAME SETTING -----------------------
  app.post(
    "/room/:roomId/game-setting",
    async (
      req: FastifyRequest<{ Params: RoomParams }>,
      reply: FastifyReply,
    ) => {
      const roomId = Number(req.params.roomId);
      const room = rooms.get(roomId);
      if (!room) {
        return reply.code(404).send({ error: "Room not found" });
      }

      // update only provided settings from client
      const { ballSpeed, ballSize, paddleSpeed, scorePoint, map } =
        req.body as {
          ballSpeed?: number;
          ballSize?: number;
          paddleSpeed?: number;
          scorePoint?: number;
          map?: string;
        };

      if (ballSpeed === undefined) {
        return reply.code(400).send({ error: "Ball speed not valid" });
      }
      if (ballSize === undefined) {
        return reply.code(400).send({ error: "Ball size not valid" });
      }
      if (paddleSpeed === undefined) {
        return reply.code(400).send({ error: "Paddle speed not valid" });
      }
      if (scorePoint === undefined) {
        return reply.code(400).send({ error: "Score point not valid" });
      }
      if (map === undefined) {
        return reply.code(400).send({ error: "Map not valid" });
      }

      // change setting if valid
      room.setting.ballSpeed = ballSpeed ?? room.setting.ballSpeed;
      room.setting.ballSize = ballSize ?? room.setting.ballSize;
      room.setting.paddleSpeed = paddleSpeed ?? room.setting.paddleSpeed;
      room.setting.scorePoint = scorePoint ?? room.setting.scorePoint;
      room.setting.map = map ?? room.setting.map;

      if (room.game) {
        room.game.updateSettings(room.setting);
      }

      // console.log("updated room setting:", room.setting); ////debug

      // Notify all connected clients in the room about the setting change
      return { success: true, setting: room.setting };
    },
  );

  // ----------------------- GET ROOM BY ID -----------------------
  app.get(
    "/room/:roomId",
    async (
      req: FastifyRequest<{ Params: RoomParams }>,
      reply: FastifyReply,
    ) => {
      const roomId = Number(req.params.roomId);
      const room = rooms.get(roomId);
      if (room === undefined) {
        return reply.code(404).send({ error: "Room not found" });
      }

      //notify room details to client
      return {
        id: room.id,
        name: room.name,
        teamSize: room.teamSize,
        setting: room.setting,
        private: room.private,
        leaderId: room.leaderId,
      };
    },
  );
}
