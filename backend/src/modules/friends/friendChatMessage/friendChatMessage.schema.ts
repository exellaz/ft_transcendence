import {
  errorResponseSchema,
  successResponseSchema,
} from "src/utils/common-schemas.";

export const friendChatMessageResponseSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    friendshipId: { type: "integer" },
    senderId: { type: "integer" },
    message: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
  },
  required: ["id", "friendshipId", "senderId", "message", "timestamp"],
  additionalProperties: false,
};

// GET /friendChatMessages/:friendshipId
export const getFriendChatMessagesByFriendshipIdSchema = {
  tags: ["friendChatMessages"],
  summary: "Get all chat messages for a specific friendship",

  params: {
    type: "object",
    properties: {
      friendshipId: { type: "integer", minimum: 1 },
    },
    required: ["friendshipId"],
  },

  response: {
    200: successResponseSchema({
      type: "array",
      items: friendChatMessageResponseSchema,
    }),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};

// GET /friendChatMessages/:friendshipId/lastMessage
export const getLastFriendChatMessageByFriendshipIdSchema = {
  tags: ["friendChatMessages"],
  summary: "Get the last chat message for a specific friendship",

  params: {
    type: "object",
    properties: {
      friendshipId: { type: "integer", minimum: 1 },
    },
    required: ["friendshipId"],
  },

  response: {
    200: successResponseSchema(friendChatMessageResponseSchema),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};
