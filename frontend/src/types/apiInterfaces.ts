// Profile dropdown API interface
// - ProfileDropdown.tsx
export interface ProfileDropdownInfo {
  id: number;
  avatarUrl: string;
  username: string;
}

// Basic info API interface
// - BasicInfoPopup.tsx
export interface BasicInfo {
  id: number;
  joinDate: string;
  avatarUrl: string;
  username: string;
  email: string;
}

// Tournament stats API interface
// - TournamentStatsPopup.tsx
export interface TournamentStats {
  id: number;
  medals: { gold: number; silver: number; bronze: number };
  tournamentsPlayed: number;
  averageRanking: number;
  tournaments: TournamentHistoryEntry[];
}

interface TournamentHistoryEntry {
  tournamentId: number;
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
// - Messaging.tsx, ProfileContents.tsx
export interface FriendBasic {
  id: number;
  avatarUrl: string;
  username: string;
  online: boolean;
  lastMessage: string;
  lastMessageTimestamp: string;
}

export interface FriendRequest {
  id: number;
  avatarUrl: string;
  username: string;
}

export interface BlockedUser {
  id: number;
  avatarUrl: string;
  username: string;
}

export interface FriendMessaging {
  id: number;
  messages: Message[];
}

interface Message {
  senderId: number;
  text: string;
  timestamp: string;
}

export interface Profile {
  id: number;
  avatarUrl: string;
  username: string;
  joinDate: string;
  stats: {
    medals: { gold: number; silver: number; bronze: number };
    tournamentsPlayed: number;
    averageRanking: number;
  };
}

// Tournament lobby API interfaces
// - TournamentLobbyView.tsx
// Player in tournament lobby
export interface WaitingTournamentPlayer {
  id: number;
  username: string;
  spriteUrl: string;
  ready: boolean;
}

// Chat message in tournament lobby
export interface LiveChatMessage {
  id: number;
  from: string;
  text: string;
  timestamp: string; // ISO string or formatted
}

export interface MatchPlayer {
  id: number;
  username: string;
  spriteUrl: string;
  ready: boolean;
  team: "left" | "right" | "unknown";
}

// Custom Mode Room API interfaces
export interface WaitingRoomPlayer {
  leader: boolean;
  id: number;
  username: string;
  spriteUrl: string;
  ready: boolean;
  team: "left" | "right";
}
