import {
  errorResponseSchema,
  successResponseSchema,
} from "src/utils/common-schemas.";

// Match schema within a tournament
export const tournamentMatchSchema = {
  type: "object",
  properties: {
    round: { type: "string" },
    opponentUsername: { type: "string" },
    score: { type: "string" },
    result: { type: "string", enum: ["win", "lose"] },
  },
  required: ["round", "opponentUsername", "score", "result"],
  additionalProperties: false,
};

// Single tournament entry schema
export const tournamentEntrySchema = {
  type: "object",
  properties: {
    tournamentId: { type: "integer" },
    date: { type: "string", format: "date" },
    ranking: { type: "integer" },
    matches: {
      type: "array",
      items: tournamentMatchSchema,
    },
  },
  required: ["tournamentId", "date", "ranking", "matches"],
  additionalProperties: false,
};

// Tournament history array schema
export const tournamentHistorySchema = {
  type: "array",
  items: tournamentEntrySchema,
};

// ------------------------------- Tournament Schemas ------------------------------

// GET /users/:id/tournament-history  - tournament history + matches
export const getUserTournamentStatsSchema = {
  tags: ["tournaments"],
  summary: "Get tournament statistics for a specific user",

  params: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 },
    },
    required: ["id"],
  },

  response: {
    200: successResponseSchema({
      type: "object",
      properties: {
        firstPlace: { type: "integer" },
        secondPlace: { type: "integer" },
        thirdPlace: { type: "integer" },
        completedTournaments: { type: "integer" },
        averageRanking: { type: "integer" },
      },
      required: [
        "firstPlace",
        "secondPlace",
        "thirdPlace",
        "completedTournaments",
        "averageRanking",
      ],
      additionalProperties: false,
    }),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};

// GET /users/:id/tournament-stats
export const getUserTournamentHistorySchema = {
  tags: ["tournaments"],
  summary: "Get tournament history for a specific user",

  params: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 },
    },
    required: ["id"],
  },

  response: {
    200: successResponseSchema(tournamentHistorySchema),
    404: errorResponseSchema,
    400: errorResponseSchema,
  },
};
