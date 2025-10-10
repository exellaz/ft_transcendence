import type {
  ProfileDropdownInfo,
  BasicInfo,
  TournamentStats,
  FriendBasic,
  FriendRequest,
  BlockedUser,
  FriendMessaging,
  Profile,
  WaitingTournamentPlayer,
  WaitingRoomPlayer,
  LiveChatMessage,
  MatchPlayer,
} from "../types/apiInterfaces";

// Profile Dropdown
export const mockProfileDropdownInfo: ProfileDropdownInfo[] = [
  {
    id: 0,
    avatarUrl: "/assets/red-ghost.png",
    username: "ghostyyyyyyyyyyyy",
  },
];

// Basic Info
export const mockBasicInfo: BasicInfo[] = [
  {
    id: 0,
    joinDate: "2025-01-01",
    avatarUrl: "/assets/red-ghost.png",
    username: "ghostyyyyyyyyyyyy",
    email: "ghosty@transcendence.com",
  },
];

// Tournament Stats
export const mockTournamentStats: TournamentStats[] = [
  {
    id: 0,
    medals: { gold: 3, silver: 2, bronze: 1 },
    tournamentsPlayed: 10,
    averageRanking: 2.5,
    tournaments: [
      // Winner (ranking: 1)
      {
        tournamentId: 1,
        date: "2025-08-01",
        ranking: 1,
        matches: [
          {
            match: "QF",
            opponentUsername: "playerA",
            score: "10-7",
            result: "win",
          },
          {
            match: "SF",
            opponentUsername: "playerB",
            score: "8-6",
            result: "win",
          },
          {
            match: "F",
            opponentUsername: "playerC",
            score: "9-8",
            result: "win",
          },
        ],
      },
      // Finals loser (ranking: 2)
      {
        tournamentId: 2,
        date: "2025-08-15",
        ranking: 2,
        matches: [
          {
            match: "QF",
            opponentUsername: "playerD",
            score: "11-9",
            result: "win",
          },
          {
            match: "SF",
            opponentUsername: "playerE",
            score: "7-6",
            result: "win",
          },
          {
            match: "F",
            opponentUsername: "playerF",
            score: "7-9",
            result: "lost",
          },
        ],
      },
      // Semifinals loser (ranking: 3)
      {
        tournamentId: 3,
        date: "2025-08-15",
        ranking: 3,
        matches: [
          {
            match: "QF",
            opponentUsername: "playerG",
            score: "9-6",
            result: "win",
          },
          {
            match: "SF",
            opponentUsername: "playerH",
            score: "5-8",
            result: "lost",
          },
          // Did not reach finals
        ],
      },
      // Semifinals loser (ranking: 4)
      {
        tournamentId: 4,
        date: "2025-08-15",
        ranking: 4,
        matches: [
          {
            match: "QF",
            opponentUsername: "playerI",
            score: "8-7",
            result: "win",
          },
          {
            match: "SF",
            opponentUsername: "playerJ",
            score: "4-9",
            result: "lost",
          },
        ],
      },
      // Quarterfinals loser (ranking: 5)
      {
        tournamentId: 5,
        date: "2025-08-15",
        ranking: 5,
        matches: [
          {
            match: "QF",
            opponentUsername: "playerK",
            score: "4-10",
            result: "lost",
          },
        ],
      },
      // Quarterfinals loser (ranking: 6)
      {
        tournamentId: 6,
        date: "2025-08-15",
        ranking: 6,
        matches: [
          {
            match: "QF",
            opponentUsername: "playerL",
            score: "5-9",
            result: "lost",
          },
        ],
      },
      // Quarterfinals loser (ranking: 7)
      {
        tournamentId: 7,
        date: "2025-08-15",
        ranking: 7,
        matches: [
          {
            match: "QF",
            opponentUsername: "playerM",
            score: "6-8",
            result: "lost",
          },
        ],
      },
      // Quarterfinals loser (ranking: 8)
      {
        tournamentId: 8,
        date: "2025-08-15",
        ranking: 8,
        matches: [
          {
            match: "QF",
            opponentUsername: "playerN",
            score: "3-10",
            result: "lost",
          },
        ],
      },
    ],
  },
];

// Friends Basic
export const mockFriends: FriendBasic[] = [
  {
    id: 1,
    avatarUrl: "/assets/bronze.png",
    username: "Sophia",
    online: true,
    lastMessage: "Ready for the next match?",
    lastMessageTimestamp: "2025-09-07 14:32",
  },
  {
    id: 2,
    avatarUrl: "/assets/gold.png",
    username: "Liam",
    online: false,
    lastMessage: "See you tomorrow!",
    lastMessageTimestamp: "2025-09-07 13:10",
  },
  {
    id: 3,
    avatarUrl: "/assets/silver.png",
    username: "Olivia",
    online: true,
    lastMessage: "Let's practice soon!",
    lastMessageTimestamp: "2025-09-06 18:45",
  },
  {
    id: 4,
    avatarUrl: "/assets/green-tick.png",
    username: "Noah",
    online: false,
    lastMessage: "Good luck!",
    lastMessageTimestamp: "2025-09-05 20:12",
  },
  {
    id: 5,
    avatarUrl: "/assets/yellow-ghost.png",
    username: "Emma",
    online: true,
    lastMessage: "Congrats on your win!",
    lastMessageTimestamp: "2025-09-04 16:30",
  },
  {
    id: 6,
    avatarUrl: "/assets/red-ghost.png",
    username: "Mason",
    online: true,
    lastMessage: "Let's team up next time.",
    lastMessageTimestamp: "2025-09-03 11:05",
  },
];

// Friend Requests
export const mockRequests: FriendRequest[] = [
  { id: 7, avatarUrl: "/assets/bronze.png", username: "Ava" },
  { id: 8, avatarUrl: "/assets/gold.png", username: "Elijah" },
  { id: 9, avatarUrl: "/assets/silver.png", username: "Isabella" },
  { id: 10, avatarUrl: "/assets/green-tick.png", username: "James" },
  { id: 11, avatarUrl: "/assets/yellow-ghost.png", username: "Mia" },
  { id: 12, avatarUrl: "/assets/red-ghost.png", username: "Benjamin" },
  { id: 13, avatarUrl: "/assets/bronze.png", username: "Charlotte" },
  { id: 14, avatarUrl: "/assets/gold.png", username: "Henry" },
];

// Blocked Users
export const mockBlocked: BlockedUser[] = [
  { id: 15, avatarUrl: "/assets/bronze.png", username: "Amelia" },
  { id: 16, avatarUrl: "/assets/gold.png", username: "Lucas" },
  { id: 17, avatarUrl: "/assets/silver.png", username: "Harper" },
  { id: 18, avatarUrl: "/assets/green-tick.png", username: "Jack" },
  { id: 19, avatarUrl: "/assets/yellow-ghost.png", username: "Ella" },
  { id: 20, avatarUrl: "/assets/red-ghost.png", username: "William" },
  { id: 21, avatarUrl: "/assets/bronze.png", username: "Evelyn" },
  { id: 22, avatarUrl: "/assets/gold.png", username: "Alexander" },
  { id: 23, avatarUrl: "/assets/silver.png", username: "Scarlett" },
  { id: 24, avatarUrl: "/assets/green-tick.png", username: "Henry" },
  { id: 25, avatarUrl: "/assets/yellow-ghost.png", username: "Grace" },
  { id: 26, avatarUrl: "/assets/red-ghost.png", username: "Daniel" },
];

// Friends Messaging
export const mockMessages: FriendMessaging[] = [
  {
    id: 1,
    messages: [
      {
        senderId: 0,
        text: "Hey Sophia! Are you joining the tournament tonight?",
        timestamp: "2025-09-07 14:00",
      },
      {
        senderId: 1,
        text: "Hi! Yes, I’ll be there. Are you ready?",
        timestamp: "2025-09-07 14:05",
      },
      {
        senderId: 0,
        text: "Almost! Just practicing a bit more.",
        timestamp: "2025-09-07 14:10",
      },
      {
        senderId: 1,
        text: "Great! See you soon.",
        timestamp: "2025-09-07 14:32",
      },
    ],
  },
  {
    id: 2,
    messages: [
      {
        senderId: 2,
        text: "Hey, did you check the new update?",
        timestamp: "2025-09-07 12:50",
      },
      {
        senderId: 0,
        text: "Not yet, is it good?",
        timestamp: "2025-09-07 12:55",
      },
      {
        senderId: 2,
        text: "Yeah, lots of bug fixes and a new map!",
        timestamp: "2025-09-07 13:00",
      },
      {
        senderId: 0,
        text: "Awesome, let’s try it tomorrow.",
        timestamp: "2025-09-07 13:10",
      },
    ],
  },
  {
    id: 3,
    messages: [
      {
        senderId: 0,
        text: "Olivia, want to practice later?",
        timestamp: "2025-09-06 18:00",
      },
      {
        senderId: 3,
        text: "Sure! What time?",
        timestamp: "2025-09-06 18:10",
      },
      {
        senderId: 0,
        text: "How about 7pm?",
        timestamp: "2025-09-06 18:20",
      },
      {
        senderId: 3,
        text: "Works for me. See you then!",
        timestamp: "2025-09-06 18:45",
      },
    ],
  },
  {
    id: 4,
    messages: [
      {
        senderId: 4,
        text: "Good luck in the finals!",
        timestamp: "2025-09-05 20:00",
      },
      {
        senderId: 0,
        text: "Thanks Noah! Root for me!",
        timestamp: "2025-09-05 20:12",
      },
    ],
  },
  {
    id: 5,
    messages: [
      {
        senderId: 0,
        text: "Emma, congrats on your win!",
        timestamp: "2025-09-04 16:00",
      },
      {
        senderId: 5,
        text: "Thank you! You played well too.",
        timestamp: "2025-09-04 16:10",
      },
      {
        senderId: 0,
        text: "Let’s celebrate soon.",
        timestamp: "2025-09-04 16:30",
      },
    ],
  },
  {
    id: 6,
    messages: [
      {
        senderId: 6,
        text: "Let’s team up next time!",
        timestamp: "2025-09-03 11:00",
      },
      {
        senderId: 0,
        text: "Definitely! We’ll be unstoppable.",
        timestamp: "2025-09-03 11:05",
      },
    ],
  },
];

// Profile
export const mockProfiles: Profile[] = [
  {
    id: 0,
    username: "ghostyyyyyyyyyyyy",
    avatarUrl: "/assets/red-ghost.png",
    joinDate: "2025-01-01",
    stats: {
      medals: { gold: 3, silver: 2, bronze: 1 },
      tournamentsPlayed: 10,
      averageRanking: 2.5,
    },
  },
  {
    id: 1,
    username: "Sophia",
    avatarUrl: "/assets/bronze.png",
    joinDate: "2024-11-21",
    stats: {
      medals: { gold: 2, silver: 1, bronze: 0 },
      tournamentsPlayed: 8,
      averageRanking: 2.3,
    },
  },
  {
    id: 2,
    username: "Liam",
    avatarUrl: "/assets/gold.png",
    joinDate: "2025-01-15",
    stats: {
      medals: { gold: 1, silver: 2, bronze: 1 },
      tournamentsPlayed: 5,
      averageRanking: 3.1,
    },
  },
  {
    id: 3,
    username: "Olivia",
    avatarUrl: "/assets/silver.png",
    joinDate: "2025-02-10",
    stats: {
      medals: { gold: 0, silver: 3, bronze: 2 },
      tournamentsPlayed: 6,
      averageRanking: 4.0,
    },
  },
  {
    id: 4,
    username: "Noah",
    avatarUrl: "/assets/green-tick.png",
    joinDate: "2025-03-05",
    stats: {
      medals: { gold: 1, silver: 0, bronze: 3 },
      tournamentsPlayed: 4,
      averageRanking: 5.2,
    },
  },
  {
    id: 5,
    username: "Emma",
    avatarUrl: "/assets/yellow-ghost.png",
    joinDate: "2025-04-20",
    stats: {
      medals: { gold: 3, silver: 1, bronze: 0 },
      tournamentsPlayed: 9,
      averageRanking: 1.7,
    },
  },
  {
    id: 6,
    username: "Mason",
    avatarUrl: "/assets/red-ghost.png",
    joinDate: "2025-05-12",
    stats: {
      medals: { gold: 2, silver: 2, bronze: 2 },
      tournamentsPlayed: 7,
      averageRanking: 2.9,
    },
  },
  {
    id: 7,
    username: "Ava",
    avatarUrl: "/assets/bronze.png",
    joinDate: "2025-06-01",
    stats: {
      medals: { gold: 0, silver: 1, bronze: 0 },
      tournamentsPlayed: 2,
      averageRanking: 5.0,
    },
  },
  {
    id: 8,
    username: "Elijah",
    avatarUrl: "/assets/gold.png",
    joinDate: "2025-06-10",
    stats: {
      medals: { gold: 1, silver: 0, bronze: 1 },
      tournamentsPlayed: 3,
      averageRanking: 3.7,
    },
  },
  {
    id: 9,
    username: "Isabella",
    avatarUrl: "/assets/silver.png",
    joinDate: "2025-07-01",
    stats: {
      medals: { gold: 0, silver: 2, bronze: 0 },
      tournamentsPlayed: 1,
      averageRanking: 6.0,
    },
  },
  {
    id: 10,
    username: "James",
    avatarUrl: "/assets/green-tick.png",
    joinDate: "2025-07-15",
    stats: {
      medals: { gold: 0, silver: 0, bronze: 2 },
      tournamentsPlayed: 2,
      averageRanking: 4.2,
    },
  },
  {
    id: 11,
    username: "Mia",
    avatarUrl: "/assets/yellow-ghost.png",
    joinDate: "2025-08-01",
    stats: {
      medals: { gold: 1, silver: 1, bronze: 0 },
      tournamentsPlayed: 2,
      averageRanking: 3.5,
    },
  },
  {
    id: 12,
    username: "Benjamin",
    avatarUrl: "/assets/red-ghost.png",
    joinDate: "2025-08-10",
    stats: {
      medals: { gold: 0, silver: 0, bronze: 1 },
      tournamentsPlayed: 1,
      averageRanking: 7.0,
    },
  },
  {
    id: 13,
    username: "Charlotte",
    avatarUrl: "/assets/bronze.png",
    joinDate: "2025-08-15",
    stats: {
      medals: { gold: 2, silver: 0, bronze: 0 },
      tournamentsPlayed: 3,
      averageRanking: 2.8,
    },
  },
  {
    id: 14,
    username: "Henry",
    avatarUrl: "/assets/gold.png",
    joinDate: "2025-08-20",
    stats: {
      medals: { gold: 1, silver: 1, bronze: 1 },
      tournamentsPlayed: 4,
      averageRanking: 4.5,
    },
  },
  {
    id: 15,
    username: "Amelia",
    avatarUrl: "/assets/bronze.png",
    joinDate: "2025-03-01",
    stats: {
      medals: { gold: 0, silver: 1, bronze: 2 },
      tournamentsPlayed: 2,
      averageRanking: 6.2,
    },
  },
  {
    id: 16,
    username: "Lucas",
    avatarUrl: "/assets/gold.png",
    joinDate: "2025-03-10",
    stats: {
      medals: { gold: 1, silver: 0, bronze: 0 },
      tournamentsPlayed: 1,
      averageRanking: 7.0,
    },
  },
  {
    id: 17,
    username: "Harper",
    avatarUrl: "/assets/silver.png",
    joinDate: "2025-03-15",
    stats: {
      medals: { gold: 0, silver: 2, bronze: 1 },
      tournamentsPlayed: 3,
      averageRanking: 5.5,
    },
  },
  {
    id: 18,
    username: "Jack",
    avatarUrl: "/assets/green-tick.png",
    joinDate: "2025-03-20",
    stats: {
      medals: { gold: 1, silver: 1, bronze: 0 },
      tournamentsPlayed: 2,
      averageRanking: 4.8,
    },
  },
  {
    id: 19,
    username: "Ella",
    avatarUrl: "/assets/yellow-ghost.png",
    joinDate: "2025-03-25",
    stats: {
      medals: { gold: 0, silver: 0, bronze: 2 },
      tournamentsPlayed: 1,
      averageRanking: 7.5,
    },
  },
  {
    id: 20,
    username: "William",
    avatarUrl: "/assets/red-ghost.png",
    joinDate: "2025-04-01",
    stats: {
      medals: { gold: 2, silver: 1, bronze: 0 },
      tournamentsPlayed: 4,
      averageRanking: 3.2,
    },
  },
  {
    id: 21,
    username: "Evelyn",
    avatarUrl: "/assets/bronze.png",
    joinDate: "2025-04-05",
    stats: {
      medals: { gold: 1, silver: 0, bronze: 1 },
      tournamentsPlayed: 2,
      averageRanking: 5.9,
    },
  },
  {
    id: 22,
    username: "Alexander",
    avatarUrl: "/assets/gold.png",
    joinDate: "2025-04-10",
    stats: {
      medals: { gold: 0, silver: 2, bronze: 0 },
      tournamentsPlayed: 3,
      averageRanking: 4.7,
    },
  },
  {
    id: 23,
    username: "Scarlett",
    avatarUrl: "/assets/silver.png",
    joinDate: "2025-04-15",
    stats: {
      medals: { gold: 2, silver: 1, bronze: 1 },
      tournamentsPlayed: 5,
      averageRanking: 3.8,
    },
  },
  {
    id: 24,
    username: "Henry",
    avatarUrl: "/assets/green-tick.png",
    joinDate: "2025-04-20",
    stats: {
      medals: { gold: 1, silver: 1, bronze: 2 },
      tournamentsPlayed: 4,
      averageRanking: 4.1,
    },
  },
  {
    id: 25,
    username: "Grace",
    avatarUrl: "/assets/yellow-ghost.png",
    joinDate: "2025-04-25",
    stats: {
      medals: { gold: 0, silver: 0, bronze: 1 },
      tournamentsPlayed: 1,
      averageRanking: 6.8,
    },
  },
  {
    id: 26,
    username: "Daniel",
    avatarUrl: "/assets/red-ghost.png",
    joinDate: "2025-05-01",
    stats: {
      medals: { gold: 1, silver: 2, bronze: 0 },
      tournamentsPlayed: 3,
      averageRanking: 5.3,
    },
  },
];

export const mockWaitingTournamentPlayers: Record<
  string,
  WaitingTournamentPlayer[]
> = {
  t1: [
    {
      id: 1,
      username: "Player1",
      spriteUrl: "/assets/yellow-ghost.png",
      ready: true,
    },
    {
      id: 2,
      username: "Player2",
      spriteUrl: "/assets/green-ghost.png",
      ready: false,
    },
    {
      id: 3,
      username: "Player3",
      spriteUrl: "/assets/blue-ghost.png",
      ready: true,
    },
    {
      id: 4,
      username: "Player4",
      spriteUrl: "/assets/red-ghost.png",
      ready: true,
    },
    {
      id: 5,
      username: "Player5",
      spriteUrl: "/assets/purple-ghost.png",
      ready: false,
    },
    {
      id: 6,
      username: "Player6",
      spriteUrl: "/assets/starry-ghost.png",
      ready: true,
    },
    {
      id: 7,
      username: "Player7",
      spriteUrl: "/assets/white-ghost.png",
      ready: false,
    },
    {
      id: 8,
      username: "Player8",
      spriteUrl: "/assets/42-ghost.png",
      ready: true,
    },
  ],
};

export const mockTournamentLiveChat: Record<string, LiveChatMessage[]> = {
  t1: [
    { id: 1, text: "Hello!", timestamp: "2025-09-07 13:45" },
    { id: 2, text: "Ready to play!", timestamp: "2025-09-07 13:46" },
    { id: 3, text: "Good luck everyone!", timestamp: "2025-09-07 13:47" },
    { id: 4, text: "Let's do this!", timestamp: "2025-09-07 13:48" },
    { id: 5, text: "Who's playing first?", timestamp: "2025-09-07 13:49" },
    { id: 6, text: "I'm excited!", timestamp: "2025-09-07 13:50" },
    {
      id: 7,
      text: "May the best ghost win!",
      timestamp: "2025-09-07 13:51",
    },
    { id: 8, text: "Ready and waiting!", timestamp: "2025-09-07 13:52" },
    {
      id: 1,
      text: "Nice sprites, everyone!",
      timestamp: "2025-09-07 13:53",
    },
    { id: 3, text: "Thanks! Yours too!", timestamp: "2025-09-07 13:54" },
    { id: 2, text: "Let's start soon!", timestamp: "2025-09-07 13:55" },
  ],
};

export const mockMatchPlayers: Record<string, MatchPlayer[]> = {
  t1: [
    {
      id: 0,
      username: "Player1",
      spriteUrl: "/assets/yellow-ghost.png",
      ready: true,
    },
    {
      id: 1,
      username: "Player2",
      spriteUrl: "/assets/red-ghost.png",
      ready: false,
    },
  ],
};

export const mockWaitingSinglesRoomPlayers: Record<
  string,
  WaitingRoomPlayer[]
> = {
  t1: [
    {
      leader: true,
      id: 1,
      username: "Player1",
      spriteUrl: "/assets/yellow-ghost.png",
      ready: true,
      team: "left",
    },
    {
      leader: false,
      id: 2,
      username: "Player2",
      spriteUrl: "/assets/green-ghost.png",
      ready: false,
      team: "right",
    },
  ],
};

export const mockSinglesRoomLiveChat: Record<string, LiveChatMessage[]> = {
  t1: [
    {
      id: 1,
      text: "hey! ready for this match?",
      timestamp: "2025-09-19 14:30",
    },
    {
      id: 2,
      text: "yeah let's go! you picked a tough map",
      timestamp: "2025-09-19 14:30",
    },
    {
      id: 1,
      text: "haha map 3 is my favorite",
      timestamp: "2025-09-19 14:31",
    },
    {
      id: 2,
      text: "fair enough, i usually play map 1",
      timestamp: "2025-09-19 14:31",
    },
    {
      id: 1,
      text: "what paddle speed you using?",
      timestamp: "2025-09-19 14:32",
    },
    {
      id: 2,
      text: "fast paddle, normal ball",
      timestamp: "2025-09-19 14:32",
    },
    {
      id: 1,
      text: "nice, i went with normal everything",
      timestamp: "2025-09-19 14:33",
    },
    {
      id: 2,
      text: "solid choice. good luck!",
      timestamp: "2025-09-19 14:33",
    },
    {
      id: 1,
      text: "you too! may the best player win",
      timestamp: "2025-09-19 14:34",
    },
    { id: 2, text: "let's do this 🏓", timestamp: "2025-09-19 14:34" },
    { id: 1, text: "ready when you are", timestamp: "2025-09-19 14:35" },
  ],
};

export const mockWaitingDoublesRoomPlayers: Record<
  string,
  WaitingRoomPlayer[]
> = {
  t1: [
    {
      leader: true,
      id: 1,
      username: "Player1",
      spriteUrl: "/assets/yellow-ghost.png",
      ready: true,
      team: "right",
    },
    {
      leader: false,
      id: 2,
      username: "Player2",
      spriteUrl: "/assets/green-ghost.png",
      ready: false,
      team: "right",
    },
    {
      leader: false,
      id: 3,
      username: "Player3",
      spriteUrl: "/assets/blue-ghost.png",
      ready: true,
      team: "right",
    },
    {
      leader: false,
      id: 4,
      username: "Player4",
      spriteUrl: "/assets/red-ghost.png",
      ready: true,
      team: "right",
    },
  ],
};

export const mockDoublesRoomLiveChat: Record<string, LiveChatMessage[]> = {
  t1: [
    {
      id: 1,
      text: "hey team! who wants to be my partner?",
      timestamp: "2025-09-19 15:20",
    },
    {
      id: 2,
      text: "i'm down! 3 and 4 can team up",
      timestamp: "2025-09-19 15:20",
    },
    { id: 3, text: "sounds good to me", timestamp: "2025-09-19 15:21" },
    {
      id: 4,
      text: "perfect, me and 3 vs you two",
      timestamp: "2025-09-19 15:21",
    },
    {
      id: 1,
      text: "nice! what map should we play?",
      timestamp: "2025-09-19 15:22",
    },
    {
      id: 3,
      text: "how about map 2? it's good for doubles",
      timestamp: "2025-09-19 15:22",
    },
    {
      id: 2,
      text: "agreed, map 2 has more space",
      timestamp: "2025-09-19 15:23",
    },
    {
      id: 4,
      text: "works for me. what about ball speed?",
      timestamp: "2025-09-19 15:23",
    },
    {
      id: 1,
      text: "let's go with normal settings",
      timestamp: "2025-09-19 15:24",
    },
    {
      id: 3,
      text: "normal is fine, keeps it fair",
      timestamp: "2025-09-19 15:24",
    },
    {
      id: 2,
      text: "1, you take the left side?",
      timestamp: "2025-09-19 15:25",
    },
    { id: 1, text: "sure thing partner!", timestamp: "2025-09-19 15:25" },
    {
      id: 4,
      text: "3 and i are ready when you are",
      timestamp: "2025-09-19 15:26",
    },
    {
      id: 3,
      text: "this is gonna be epic 🏓",
      timestamp: "2025-09-19 15:26",
    },
    {
      id: 2,
      text: "let's show them what we got!",
      timestamp: "2025-09-19 15:27",
    },
    { id: 1, text: "ready to start!", timestamp: "2025-09-19 15:27" },
  ],
};
