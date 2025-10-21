import { userResponseSchema } from "src/modules/users/users.schema";
import {
  errorResponseSchema,
  successResponseSchema,
} from "src/utils/common-schemas.";

export const userWithFriendshipResponseSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    username: { type: "string" },
    email: { type: "string", format: "email" },
    avatarUrl: { type: ["string", "null"] },
    status: { type: "string", enum: ["online", "offline"] },
    joinedAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    friendshipId: { type: "integer" },
  },
  required: [
    "id",
    "username",
    "email",
    "avatarUrl",
    "status",
    "joinedAt",
    "updatedAt",
  ],
  additionalProperties: false,
};

export const friendshipResponseSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    requesterId: { type: "integer" },
    accepterId: { type: "integer" },
    status: { type: "string", enum: ["pending", "accepted", "rejected"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "requesterId",
    "accepterId",
    "status",
    "createdAt",
    "updatedAt",
  ],
  additionalProperties: false,
};

// ------------------------------- Friendship Schemas ------------------------------

// GET /friendships/:userId
export const getFriendShipsByUserIdSchema = {
  tags: ["friendships"], // <- groups under "user" tag in Swagger
  summary: "Get all friendships for a user",

  params: {
    type: "object",
    properties: {
      userId: { type: "integer", minimum: 1 },
    },
    required: ["userId"],
  },
};

// GET /friendships/:userId/pending (get friends that send friend request to u)
export const getPendingFriendShipsByUserIdSchema = {
  tags: ["friendships"], // <- groups under "user" tag in Swagger
  summary: "Get all pending friend requests for a user",

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
    400: errorResponseSchema,
  },
};

// GET /friendships/:userId/accepted — get all accepted friends (excluding blocked ones)
export const getAcceptedFriendShipsByUserIdSchema = {
  tags: ["friendships"], // <- groups under "user" tag in Swagger
  summary: "Get all accepted friends for a user",

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
      items: userWithFriendshipResponseSchema,
    }),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};

// POST /friendships
export const createFriendshipSchema = {
  tags: ["friendships"], // <- groups under "user" tag in Swagger
  summary: "Create a new friendship",

  body: {
    type: "object",
    properties: {
      requesterId: { type: "integer", minimum: 1 },
      accepterId: { type: "integer", minimum: 1 },
      accepterUsername: { type: "string" },
      status: {
        type: "string",
        enum: ["pending", "accepted", "blocked"], // Prisma enum
        default: "pending",
      },
    },
    required: ["requesterId"],
    additionalProperties: false, // disallow extra fields
  },

  response: {
    200: successResponseSchema(friendshipResponseSchema),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};

// PATCH /friendships/:requesterId/:accepterId
export const updateFriendshipSchema = {
  tags: ["friendships"], // <- groups under "user" tag in Swagger
  summary: "Update an existing friendship",

  params: {
    type: "object",
    properties: {
      requesterId: { type: "integer", minimum: 1 },
      accepterId: { type: "integer", minimum: 1 },
    },
    required: ["requesterId", "accepterId"],
  },

  body: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["pending", "accepted", "blocked"], // Prisma enum
        default: "pending",
      },
    },
    additionalProperties: false, // disallow extra fields
  },
  response: {
    200: successResponseSchema(friendshipResponseSchema),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};

// DELETE /friendships/:requesterId/:accepterId
export const deleteFriendshipSchema = {
  tags: ["friendships"], // <- groups under "user" tag in Swagger
  summary: "Delete a friendship",

  params: {
    type: "object",
    properties: {
      requesterId: { type: "integer", minimum: 1 },
      accepterId: { type: "integer", minimum: 1 },
    },
    required: ["requesterId", "accepterId"],
  },

  response: {
    200: successResponseSchema(friendshipResponseSchema),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};
