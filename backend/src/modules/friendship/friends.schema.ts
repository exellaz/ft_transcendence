
// GET /friendships/:userId
export const getFriendShipsByUserIdSchema = {
	params: {
	  type: "object",
	  properties: {
			userId: { type: "integer", minimum: 1 }
	  },
	  required: ["userId"]
	},
	querystring: {
		type: "object",
		properties: {
		  status: { type: "string", enum: ["pending", "accepted", "blocked"] },
		},
		required: ["status"], // or leave this out if optional
	  },
}

// POST /friendships
export const createFriendshipSchema = {
	body: {
		type: "object",
		properties: {
			userId: { type: "integer", minimum: 1 },
		  friendId: { type: "integer", minimum: 1 },
		  status: {
				type: "string",
				enum: ["pending", "accepted", "blocked"], // Prisma enum
				default: "pending"
		  }
		},
		required: ["userId", "friendId"],
		additionalProperties: false // disallow extra fields
	}
}
