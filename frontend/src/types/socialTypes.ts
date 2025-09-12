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

export interface Message {
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


