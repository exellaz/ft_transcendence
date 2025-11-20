import type {
  GetTournamentHistoryRequest,
  GetTournamentHistoryResponse,
  GetTournamentStatsRequest,
  GetTournamentStatsResponse,
} from "@/types/tournamentApi";

const VITE_API_URL = import.meta.env.VITE_API_URL;

// GET /users/:id/tournament-history  - tournament history + matches
export async function getTournamentHistoryRequest({
  id,
}: GetTournamentHistoryRequest): Promise<GetTournamentHistoryResponse> {
  const res = await fetch(`${VITE_API_URL}/users/${id}/tournament-history`, {
    method: "GET",
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
  });

  return res.json();
}

// GET /users/:id/tournament-stats
export async function getTournamentStatsRequest({
  id,
}: GetTournamentStatsRequest): Promise<GetTournamentStatsResponse> {
  const res = await fetch(`${VITE_API_URL}/users/${id}/tournament-stats`, {
    method: "GET",
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
  });

  return res.json();
}
