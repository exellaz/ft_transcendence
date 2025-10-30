import {
  successResponseSchema,
  errorResponseSchema,
} from "src/utils/common-schemas.";

export const idParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
  },
  required: ["id"],
};

export const userResponseSchema = {
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
};

export const userSettingsResponseSchema = {
  type: "object",
  properties: {
    userId: { type: "integer" },
    language: {
      type: "string",
      enum: ["english", "simplified_chinese", "traditional_chinese"],
    },
  },
  required: ["userId", "language"],
  additionalProperties: false,
};

// ------------------------------ User Settings Schemas ------------------------------

// GET /users/:id/settings
export const getUserSettingsByIdSchema = {
  tags: ["user"],
  summary: "Get user settings by user ID",

  params: idParamSchema,

  response: {
    200: successResponseSchema(userSettingsResponseSchema),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};

// PATCH /users/:id/settings  (update single user settings)
export const patchUserSettingsByIdSchema = {
  tags: ["user"],
  summary: "Update user settings by user ID",

  params: idParamSchema,

  body: {
    type: "object",
    properties: {
      language: {
        type: "string",
        enum: ["english", "simplified_chinese", "traditional_chinese"],
      },
    },
    additionalProperties: false,
  },

  response: {
    200: successResponseSchema(userSettingsResponseSchema),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};

// GET /users/settings - get all user settings
export const getAllUserSettingsSchema = {
  tags: ["user"],
  summary: "Get all user settings",

  response: {
    200: successResponseSchema({
      type: "array",
      items: userSettingsResponseSchema,
    }),
    400: errorResponseSchema,
  },
};

// ------------------------------ User Schemas ------------------------------

// GET /users/:id
export const getUserByIdSchema = {
  tags: ["user"],
  summary: "Get a single user by their ID",

  params: idParamSchema,

  response: {
    200: successResponseSchema(userResponseSchema),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};

// PATCH /users/:id
export const patchUserByIdSchema = {
  tags: ["user"],
  summary: "Update a user by their ID",

  params: idParamSchema,

  body: {
    type: "object",
    properties: {
      username: {
        type: "string",
        minLength: 2,
        maxLength: 15,
        pattern: "^[a-zA-Z0-9_-]+$",
      },
    },
    additionalProperties: false,
  },

  response: {
    200: successResponseSchema(userResponseSchema),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};

// PATCH /users/:id/avatar  (upload user avatar)
export const patchUserAvatarByIdSchema = {
  tags: ["user"],
  summary: "Upload or update a user's avatar by their ID",

  params: idParamSchema,

  consumes: ["multipart/form-data"],

  response: {
    200: successResponseSchema(userResponseSchema),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};

// DELETE /users/:id
export const deleteUserByIdSchema = {
  tags: ["user"],
  summary: "Delete a user by their ID",

  params: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 },
    },
    required: ["id"],
  },

  response: {
    200: successResponseSchema(userResponseSchema),
    404: errorResponseSchema,
  },
};

// GET /users - get all users
export const getUsersSchema = {
  tags: ["user"],
  summary: "Get all users",

  response: {
    200: successResponseSchema({
      type: "array",
      items: userResponseSchema,
    }),
    400: errorResponseSchema,
  },
};
