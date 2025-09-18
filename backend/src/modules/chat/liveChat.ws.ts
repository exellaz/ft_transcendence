export const chatRooms = new Map();

export default async function liveChatRoutes(fastify: any) {
	fastify.get("/ws-chat", { websocket: true }, (connection: any, req: any) => {
		// Step 1: get client query param
		const { room } = req.query as { room?: string };

		//if no room then close connection
		if (!room) {
			connection.close();
			return;
		}

		// Step 1: asign key (room id) and value (set of clients) to map if not room exist yet
		if (!chatRooms.has(room)) {
			chatRooms.set(room, new Set());
		}
		const clients = chatRooms.get(room);
		clients.add(connection);

		// Step 2: handle incoming messages from clients
		connection.on("message", (raw: any) => {
			// console.log("Chat WebSocket received:", raw.toString()); //// debug
			const msg = JSON.parse(raw.toString());

			if (msg.type === "chat") {
				const chatMsg = {
					type: "chat",
					from: msg.from, //client id from client
					text: msg.text, //text from client
					time: Date.now(),
				};
				//broadcast to all clients in the room
				for (const client of clients) {
					if (client.readyState === WebSocket.OPEN)
						client.send(JSON.stringify(chatMsg));
				}
			}

			if (msg.type === "system") {
				const systemMsg = {
					type: "chat",
					from: "system",
					text: msg.text, //text from client
					time: Date.now(),
				};
				for (const client of clients) {
					if (client.readyState === WebSocket.OPEN)
						client.send(JSON.stringify(systemMsg));
				}
			}
			// console.log("Chat WebSocket sent:", raw.toString()); //// debug
		});

		// Step 3: handle client disconnect
		connection.on("close", () => {
			clients.delete(connection);
			if (clients.size === 0) {
				chatRooms.delete(room); //delete the room chat
			}
		})
	});
}
