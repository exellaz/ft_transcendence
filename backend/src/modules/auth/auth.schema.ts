// ------------------------------ Auth Schemas ------------------------------

import {
  errorResponseSchema,
  successResponseSchema,
} from "src/utils/common-schemas.";
import { userResponseSchema } from "../users/users.schema";

// POST /auth/register
export const postUserRegisterSchema = {
  tags: ["auth"],
  body: {
    type: "object",
    properties: {
      username: {
        type: "string",
        minLength: 2,
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
    201: successResponseSchema({
      type: "object",
      properties: {
        token: { type: "string" },
        user: userResponseSchema,
      },
      required: ["token", "user"],
      additionalProperties: false,
    }),
    400: errorResponseSchema,
    409: errorResponseSchema,
  },
};

// POST /auth/login
export const postUserLoginSchema = {
  tags: ["auth"],
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
    200: successResponseSchema({
      type: "object",
      properties: {
        token: { type: "string" },
        user: userResponseSchema,
      },
      required: ["token", "user"],
      additionalProperties: false,
    }),
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
};

// POST /auth/google
export const postGoogleAuthSchema = {
  tags: ["auth"],
  body: {
    type: "object",
    properties: {
      idToken: {
        type: "string",
        minLength: 1,
        description: "Google ID token from OAuth flow",
      },
      twoFactorCode: {
        type: "string",
        minLength: 6,
        maxLength: 6,
        description: "Authenticator code",
      },
    },
    required: ["idToken"],
    additionalProperties: false,
  },
  response: {
    200: successResponseSchema({
      type: "object",
      properties: {
        token: { type: "string" },
        user: userResponseSchema,
      },
      required: ["token", "user"],
      additionalProperties: false,
    }),
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
};
