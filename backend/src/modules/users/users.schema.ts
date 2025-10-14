import { maxHeaderSize } from "http";
import { describe } from "node:test";

// GET /users/:id
export const getUserByIdSchema = {
  params: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 },
    },
    required: ["id"],
  },

  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            id: { type: "integer" },
            username: { type: "string" },
            email: { type: "string" },
            avatarUrl: { type: ["string", "null"] },
            status: { type: "string" }, // could refine with enum if you want
            joinedAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
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
        },
      },
      required: ["success", "data"],
    },
    404: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        error: { type: "string" },
      },
      required: ["success", "error"],
    },
    400: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        error: { type: "string" },
      },
      required: ["success", "error"],
    },
  },
};

// PATCH /users/:id
export const patchUserByIdSchema = {
  params: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 },
    },
    required: ["id"],
  },
};

// DELETE /users/:id
export const deleteUserByIdSchema = {
  params: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 },
    },
    required: ["id"],
  },
};

// GET /users/:id/settings
export const getUserSettingsByIdSchema = {
  params: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 },
    },
    required: ["id"],
  },
};

// PATCH /users/:id/settings  (update single user settings)
export const patchUserSettingsByIdSchema = {
  params: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 },
    },
    required: ["id"],
  },
};

// POST /auth/register
export const postUserRegisterSchema = {
  body: {
    type: "object",
    properties: {
      username: {
        type: "string",
        minLength: 1,
        maxLength: 15,
        pattern: "^[a-zA-Z0-9_-]+$",
      },
      email: { type: "string", format: "email" },
      password: {
        type: "string",
        minLength: 8,
        maxLength: 100,
        pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
      },
    },
    required: ["username", "email", "password"],
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer" },
                username: { type: "string" },
                email: { type: "string", format: "email" },
                avatarUrl: { type: ["string", "null"] },
                status: { type: "string", enum: ["online", "offline"] },
                joinedAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
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
            },
          },
          required: ["token", "user"],
          additionalProperties: false,
        },
      },
      required: ["success", "data"],
      additionalProperties: false,
    },
    400: {
      type: "object",
      properties: {
        success: { type: "boolean", const: false },
        error: { type: "string" },
        details: {
          type: "array",
          items: { type: "string" },
          description: "Detailed validation errors",
        },
      },
      required: ["success", "error"],
      additionalProperties: false,
    },
    409: {
      type: "object",
      properties: {
        success: { type: "boolean", const: false },
        error: { type: "string" },
      },
      required: ["success", "error"],
      additionalProperties: false,
    },
  },
};

// POST /auth/login
export const postUserLoginSchema = {
  body: {
    type: "object",
    properties: {
      identifier: {
        type: "string",
        minLength: 1,
        maxLength: 255,
        pattern: "^\\S+$",
      },
      password: { type: "string", minLength: 1, maxLength: 128 },
    },
    required: ["identifier", "password"],
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean", const: true },
        data: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer" },
                username: { type: "string" },
                email: { type: "string", format: "email" },
                avatarUrl: { type: ["string", "null"] },
                status: { type: "string", enum: ["online", "offline"] },
                joinedAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
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
            },
          },
          required: ["token", "user"],
          additionalProperties: false,
        },
      },
      required: ["success", "data"],
      additionalProperties: false,
    },
    400: {
      type: "object",
      properties: {
        success: { type: "boolean", const: false },
        error: { type: "string" },
      },
      required: ["success", "error"],
      additionalProperties: false,
    },
    401: {
      type: "object",
      properties: {
        success: { type: "boolean", const: false },
        error: { type: "string" },
      },
      required: ["success", "error"],
      additionalProperties: false,
    },
  },
};
