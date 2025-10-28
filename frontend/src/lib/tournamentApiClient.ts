import type {
  GetTournamentHistoryRequest,
  GetTournamentHistoryResponse,
  GetTournamentStatsRequest,
  GetTournamentStatsResponse,
} from "@/types/tournamentApi";

const API_BASE = import.meta.env.VITE_API_URL;

// GET /users/:id/tournament-history  - tournament history + matches
export async function getTournamentHistoryRequest({
  id,
}: GetTournamentHistoryRequest): Promise<GetTournamentHistoryResponse> {
  const res = await fetch(`${API_BASE}/users/${id}/tournament-history`, {
    method: "GET",
  });

  return res.json();
}

// GET /users/:id/tournament-stats
export async function getTournamentStatsRequest({
  id,
}: GetTournamentStatsRequest): Promise<GetTournamentStatsResponse> {
  const res = await fetch(`${API_BASE}/users/${id}/tournament-stats`, {
    method: "GET",
  });

  return res.json();
}
