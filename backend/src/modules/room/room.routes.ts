import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { rooms, createRoom, generateRoomId, DEFAULT_SETTING, Room } from "./room";

interface RoomParams {
    roomId: number;
}

export default async function roomRoutes(app: FastifyInstance) {
    // ----------------------- LIST ROOMS -----------------------
    app.get("/rooms", async () => {
        const response = Array.from(rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            teamSize: room.teamSize,
            leftPlayers: room.gameState.teams.left.length,
            rightPlayers: room.gameState.teams.right.length,
            gameStarted: room.gameState.gameStarted,
            gameEnded: !!room.gameState.gameEnded,
            private: room.private
        }));
        // console.log("responding /rooms: ", response); ////debug
        return response;
    });

    // ----------------------- CREATE ROOM -----------------------
    app.post("/create-room", async (req, reply) => {
        // console.log("request /Create-room:", req.body); ////debug
        const body: any = req.body;

        //assign body parameters to variables
        const {
            name,
            teamSize,
            leaderId,
            width,
            height,
            isPrivate,
            ballSpeed,
            ballSize,
            paddleSpeed,
            scorePoint,
            map
        } = body as {
            name: string;
            teamSize: number;
            leaderId?: number;
            width: number;
            height: number;
            isPrivate?: boolean;
            ballSpeed?: number;
            ballSize?: number;
            paddleSpeed?: number;
            scorePoint?: number;
            map?: string;
        };

        console.log("Received body:", req.body);

        // Validate required fields
        if (typeof teamSize !== "number" || typeof name !== "string" || name.trim() === "") {
            return reply.code(400).send({ error: "Team size and name are required" });
        }
        if (typeof width !== "number" || typeof height !== "number") {
            return reply.code(400).send({ error: "Width and height are required" });
        }
        if (isPrivate && (!leaderId || typeof leaderId !== "number")) {
            return reply.code(400).send({ error: "Leader ID required for private rooms" });
        }

        // Generate a unique room ID
        const roomId = generateRoomId();


        //initialize game setting
        const initialSetting: Partial<typeof DEFAULT_SETTING> = {}; // set default value to initial setting
        if (typeof ballSpeed === "number") initialSetting.ballSpeed = ballSpeed; // if client provided a valid setting, use it to override the default
        if (typeof ballSize === "number") initialSetting.ballSize = ballSize;
        if (typeof paddleSpeed === "number") initialSetting.paddleSpeed = paddleSpeed;
        if (typeof scorePoint === "number") initialSetting.scorePoint = scorePoint;
        if (typeof map === "string") initialSetting.map = map;

        // Create and store the new room
        const room = createRoom(
            roomId,
            name,
            teamSize,
            isPrivate ? leaderId : -1,
            width,
            height,
            !!isPrivate,
            initialSetting // 👈 important for frontend
        );

        rooms.set(roomId, room);

        console.log("ball speed: ", ballSpeed);
        console.log(
            `${isPrivate ? "Private" : "Public"} room ${name} (${roomId}) created with team size ${teamSize}`
        );

        // Respond with room details to client
        const response = {
            roomId,
            name,
            teamSize,
            gameStarted: room.gameState.gameStarted,
            ...(isPrivate ? { leaderId } : {}), // only include leaderId if private
            private: room.private,
            setting: room.setting // 👈 important for frontend
        };
        // console.log("responding /create-room:", response); ////debug
        return response;
    });

    // ----------------------- UPDATE ROOM SETTING -----------------------
    app.post("/room/:roomId/setting", async (req: FastifyRequest<{ Params: RoomParams }>, reply: FastifyReply) => {
        const roomId = Number(req.params.roomId);
        const room = rooms.get(roomId);
        if (!room) {
            return reply.code(404).send({ error: "Room not found" });
        }

        // update only provided settings from client
        const {
            ballSpeed,
            ballSize,
            paddleSpeed,
            scorePoint,
            map
        } = req.body as {
            ballSpeed?: number;
            ballSize?: number;
            paddleSpeed?: number;
            scorePoint?: number;
            map?: string;
        };

        // change setting if valid
        room.setting.ballSpeed = ballSpeed ?? room.setting.ballSpeed;
        room.setting.ballSize = ballSize ?? room.setting.ballSize;
        room.setting.paddleSpeed = paddleSpeed ?? room.setting.paddleSpeed;
        room.setting.scorePoint = scorePoint ?? room.setting.scorePoint;
        room.setting.map = map ?? room.setting.map;

        // console.log("updated room setting:", room.setting); ////debug

        // Notify all connected clients in the room about the setting change
        return { success: true, setting: room.setting };
    });

    // ----------------------- GET ROOM BY ID -----------------------
    app.get("/room/:roomId", async (req: FastifyRequest<{ Params: RoomParams }>, reply: FastifyReply) => {
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
            width: room.width,
            height: room.height,
            setting: room.setting, // 👈 important for frontend
            gameStarted: room.gameState.gameStarted,
            gameEnded: !!room.gameState.gameEnded,
            private: room.private,
            leaderId: room.leaderId,
        };
    });
}
