// Profile dropdown API interface
// - ProfileDropdown.tsx
export interface ProfileDropdownInfo {
  uid: string;
  avatarUrl: string;
  username: string;
}

// Basic info API interface
// - BasicInfoPopup.tsx
export interface BasicInfo {
  uid: string;
  joinDate: string;
  avatarUrl: string;
  username: string;
  email: string;
}

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

// Tournament lobby API interfaces
// - TournamentLobbyView.tsx
// Player in tournament lobby
export interface WaitingPlayer {
  uid: string;
  username: string;
  spriteUrl: string;
  ready: boolean;
}

// Chat message in tournament lobby
export interface LiveChatMessage {
  uid: string;
  text: string;
  timestamp: string; // ISO string or formatted
}

export interface MatchPlayer {
  uid: string;
  username: string;
  spriteUrl: string;
  ready: boolean;
}
