export interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string;
  createdAt: string;
  stats?: Stats;
}

export interface User {
  // Basic info
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  status: "online" | "offline" | "in-game";

  // Stats
  stats?: Stats;
  detailedStats?: DetailedStats;

  // Friendships
  friends?: Friendship[];

  // Settings
  settings: UserSettings;
}

export interface Stats {
  medals: { gold: number; silver: number; bronze: number };
  tournamentsPlayed: number;
  averageRanking: number;
}

export interface DetailedStats {
  tournaments: TournamentHistoryEntry[];
}

export interface TournamentHistoryEntry {
  tournamentId: string;
  date: string; // ISO date string
  ranking: number;
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
