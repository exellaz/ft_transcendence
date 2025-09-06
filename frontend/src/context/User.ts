export interface User {
  // Basic info
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  isActive: boolean;
  joinedAt: string;
  updatedAt: string;
  status: "online" | "offline" | "in-game";

  // Stats
  stats: Stats;

  // Friendships
  friends: Friendship[];

  // Settings
  settings: UserSettings;
}

export interface Stats {
  medals: { gold: number; silver: number; bronze: number };
  tournamentsPlayed: number;
  averageRanking: number;
  detailed: DetailedStats;
}

export interface DetailedStats {
  tournaments: TournamentHistoryEntry[];
}

export interface TournamentHistoryEntry {
  tournamentId: string;
  date: string; // ISO date string
  finalRanking: number;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: "pending" | "accepted" | "blocked";
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  language: string;
  inGameCameraTracking: "static" | "dynamic";
}
