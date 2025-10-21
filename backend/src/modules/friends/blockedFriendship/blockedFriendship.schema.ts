import { userResponseSchema } from "src/modules/users/users.schema";
import {
  errorResponseSchema,
  successResponseSchema,
} from "src/utils/common-schemas.";

export const blockedFriendshipResponseSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    blockerId: { type: "integer" },
    blockedId: { type: "integer" },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "blockerId", "blockedId", "createdAt"],
  additionalProperties: false,
};

// ------------------------------- Blocked Friendship Schemas ------------------------------

// GET /blockedFriendships/:userId  (get all blocked friends by user)
export const getBlockedFriendShipsByUserIdSchema = {
  tags: ["blockedFriendships"],
  summary: "Get all blocked friendships for a user",

  params: {
    type: "object",
    properties: {
      userId: { type: "integer", minimum: 1 },
    },
    required: ["userId"],
  },

  response: {
    200: successResponseSchema({
      type: "array",
      items: userResponseSchema,
    }),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};

// POST /blockedFriendships
export const postBlockedFriendshipSchema = {
  tags: ["blockedFriendships"],
  summary: "Block a user",

  body: {
    type: "object",
    properties: {
      blockerId: { type: "integer", minimum: 1 },
      blockedId: { type: "integer", minimum: 1 },
    },
    required: ["blockerId", "blockedId"],
    additionalProperties: false,
  },

  response: {
    200: successResponseSchema(blockedFriendshipResponseSchema),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};

// DELETE /blockedFriendships/:blockerId/:blockedId - unblock (trusts frontend to place params correctly)
export const deleteBlockedFriendshipSchema = {
  tags: ["blockedFriendships"],
  summary: "Unblock a user",

  params: {
    type: "object",
    properties: {
      blockerId: { type: "integer", minimum: 1 },
      blockedId: { type: "integer", minimum: 1 },
    },
    required: ["blockerId", "blockedId"],
  },

  response: {
    200: successResponseSchema(blockedFriendshipResponseSchema),
    404: errorResponseSchema,
  },
};
