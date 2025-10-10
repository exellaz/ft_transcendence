import type { ApiResponse } from "./apiResponse";

export interface MatchSummary {
  round: "QF" | "SF" | "F"; // Quarter-Final, Semi-Final, Final
  opponentUsername: string;
  score: string; // e.g. "6-3"
  result: "win" | "lose";
}

export interface TournamentHistory {
  tournamentId: number;
  date: string; // ISO date string, e.g. "2025-10-10"
  ranking: number;
  matches: MatchSummary[];
}

export interface TournamentStats {
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  completedTournaments: number;
  averageRanking: number | null; // if user hasn't join tournaments, avgRanking = null
}

// ----------------------- API ENDPOINTS -------------------------

// GET /users/:id/tournament-history  - tournament history + matches
export interface GetTournamentHistoryRequest {
  id: number;
}

export interface GetTournamentHistoryResponse
  extends ApiResponse<TournamentHistory[]> {}

// GET /users/:id/tournament-stats
export interface GetTournamentStatsRequest {
  id: number;
}

export interface GetTournamentStatsResponse
  extends ApiResponse<TournamentStats> {}
