

// Tournament stats API interface
// - TournamentStatsPopup.tsx
export interface TournamentStats {
  uid: string;
  medals: { gold: number; silver: number; bronze: number };
  tournamentsPlayed: number;
  averageRanking: number;
  tournaments: TournamentHistoryEntry[];
}

interface TournamentHistoryEntry {
  tournamentId: string;
  date: string; // ISO date string
  ranking: number;
  matches: MatchDetail[];
}

interface MatchDetail {
  match: string;
  opponentUsername: string;
  score: string; // e.g., "10-7"
  result: "win" | "lost";
}

// Social features API interfaces
// - SocialHub.tsx, Messaging.tsx, ProfileContents.tsx
export interface FriendBasic {
  uid: string;
  avatarUrl: string;
  username: string;
  online: boolean;
  lastMessage: string;
  lastMessageTimestamp: string;
}

export interface FriendRequest {
  uid: string;
  avatarUrl: string;
  username: string;
}

export interface BlockedUser {
  uid: string;
  avatarUrl: string;
  username: string;
}

export interface FriendMessaging {
  uid: string;
  messages: Message[];
}

interface Message {
  senderUid: string;
  text: string;
  timestamp: string;
}

export interface Profile {
  uid: string;
  avatarUrl: string;
  username: string;
  joinDate: string;
  stats: {
    medals: { gold: number; silver: number; bronze: number };
    tournamentsPlayed: number;
    averageRanking: number;
  };
}


