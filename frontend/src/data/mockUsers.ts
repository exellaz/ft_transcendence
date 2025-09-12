import type {
  FriendBasic,
  FriendRequest,
  BlockedUser,
  FriendMessaging,
  Profile,
} from "../types/socialTypes";

// Friends Basic
export const mockFriends: FriendBasic[] = [
  {
    uid: "u1",
    avatarUrl: "/assets/bronze.png",
    username: "Sophia",
    online: true,
    lastMessage: "Ready for the next match?",
    lastMessageTimestamp: "2025-09-07 14:32",
  },
  {
    uid: "u2",
    avatarUrl: "/assets/gold.png",
    username: "Liam",
    online: false,
    lastMessage: "See you tomorrow!",
    lastMessageTimestamp: "2025-09-07 13:10",
  },
  {
    uid: "u3",
    avatarUrl: "/assets/silver.png",
    username: "Olivia",
    online: true,
    lastMessage: "Let's practice soon!",
    lastMessageTimestamp: "2025-09-06 18:45",
  },
  {
    uid: "u4",
    avatarUrl: "/assets/green-tick.png",
    username: "Noah",
    online: false,
    lastMessage: "Good luck!",
    lastMessageTimestamp: "2025-09-05 20:12",
  },
  {
    uid: "u5",
    avatarUrl: "/assets/yellow-ghost.png",
    username: "Emma",
    online: true,
    lastMessage: "Congrats on your win!",
    lastMessageTimestamp: "2025-09-04 16:30",
  },
  {
    uid: "u6",
    avatarUrl: "/assets/red-ghost.png",
    username: "Mason",
    online: true,
    lastMessage: "Let's team up next time.",
    lastMessageTimestamp: "2025-09-03 11:05",
  },
];

// Friend Requests
export const mockRequests: FriendRequest[] = [
  { uid: "u7", avatarUrl: "/assets/bronze.png", username: "Ava" },
  { uid: "u8", avatarUrl: "/assets/gold.png", username: "Elijah" },
  { uid: "u9", avatarUrl: "/assets/silver.png", username: "Isabella" },
  { uid: "u10", avatarUrl: "/assets/green-tick.png", username: "James" },
  { uid: "u11", avatarUrl: "/assets/yellow-ghost.png", username: "Mia" },
  { uid: "u12", avatarUrl: "/assets/red-ghost.png", username: "Benjamin" },
  { uid: "u13", avatarUrl: "/assets/bronze.png", username: "Charlotte" },
  { uid: "u14", avatarUrl: "/assets/gold.png", username: "Henry" },
];

// Blocked Users
export const mockBlocked: BlockedUser[] = [
  { uid: "u15", avatarUrl: "/assets/bronze.png", username: "Amelia" },
  { uid: "u16", avatarUrl: "/assets/gold.png", username: "Lucas" },
  { uid: "u17", avatarUrl: "/assets/silver.png", username: "Harper" },
  { uid: "u18", avatarUrl: "/assets/green-tick.png", username: "Jack" },
  { uid: "u19", avatarUrl: "/assets/yellow-ghost.png", username: "Ella" },
  { uid: "u20", avatarUrl: "/assets/red-ghost.png", username: "William" },
  { uid: "u21", avatarUrl: "/assets/bronze.png", username: "Evelyn" },
  { uid: "u22", avatarUrl: "/assets/gold.png", username: "Alexander" },
  { uid: "u23", avatarUrl: "/assets/silver.png", username: "Scarlett" },
  { uid: "u24", avatarUrl: "/assets/green-tick.png", username: "Henry" },
  { uid: "u25", avatarUrl: "/assets/yellow-ghost.png", username: "Grace" },
  { uid: "u26", avatarUrl: "/assets/red-ghost.png", username: "Daniel" },
];

// Friends Messaging
export const mockMessages: FriendMessaging[] = [
  {
    uid: "u1",
    messages: [
      {
        senderUid: "u0",
        text: "Hey Sophia! Are you joining the tournament tonight?",
        timestamp: "2025-09-07 14:00",
      },
      {
        senderUid: "recipient",
        text: "Hi! Yes, I’ll be there. Are you ready?",
        timestamp: "2025-09-07 14:05",
      },
      {
        senderUid: "u0",
        text: "Almost! Just practicing a bit more.",
        timestamp: "2025-09-07 14:10",
      },
      {
        senderUid: "recipient",
        text: "Great! See you soon.",
        timestamp: "2025-09-07 14:32",
      },
    ],
  },
  {
    uid: "u2",
    messages: [
      {
        senderUid: "recipient",
        text: "Hey, did you check the new update?",
        timestamp: "2025-09-07 12:50",
      },
      {
        senderUid: "u0",
        text: "Not yet, is it good?",
        timestamp: "2025-09-07 12:55",
      },
      {
        senderUid: "recipient",
        text: "Yeah, lots of bug fixes and a new map!",
        timestamp: "2025-09-07 13:00",
      },
      {
        senderUid: "u0",
        text: "Awesome, let’s try it tomorrow.",
        timestamp: "2025-09-07 13:10",
      },
    ],
  },
  {
    uid: "u3",
    messages: [
      {
        senderUid: "u0",
        text: "Olivia, want to practice later?",
        timestamp: "2025-09-06 18:00",
      },
      {
        senderUid: "recipient",
        text: "Sure! What time?",
        timestamp: "2025-09-06 18:10",
      },
      {
        senderUid: "u0",
        text: "How about 7pm?",
        timestamp: "2025-09-06 18:20",
      },
      {
        senderUid: "recipient",
        text: "Works for me. See you then!",
        timestamp: "2025-09-06 18:45",
      },
    ],
  },
  {
    uid: "u4",
    messages: [
      {
        senderUid: "recipient",
        text: "Good luck in the finals!",
        timestamp: "2025-09-05 20:00",
      },
      {
        senderUid: "u0",
        text: "Thanks Noah! Root for me!",
        timestamp: "2025-09-05 20:12",
      },
    ],
  },
  {
    uid: "u5",
    messages: [
      {
        senderUid: "u0",
        text: "Emma, congrats on your win!",
        timestamp: "2025-09-04 16:00",
      },
      {
        senderUid: "recipient",
        text: "Thank you! You played well too.",
        timestamp: "2025-09-04 16:10",
      },
      {
        senderUid: "u0",
        text: "Let’s celebrate soon.",
        timestamp: "2025-09-04 16:30",
      },
    ],
  },
  {
    uid: "u6",
    messages: [
      {
        senderUid: "recipient",
        text: "Let’s team up next time!",
        timestamp: "2025-09-03 11:00",
      },
      {
        senderUid: "u0",
        text: "Definitely! We’ll be unstoppable.",
        timestamp: "2025-09-03 11:05",
      },
    ],
  },
];

// Profile
export const mockProfiles: Profile[] = [
  {
    uid: "u0",
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
    uid: "u1",
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
    uid: "u2",
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
    uid: "u3",
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
    uid: "u4",
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
    uid: "u5",
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
    uid: "u6",
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
    uid: "u7",
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
    uid: "u8",
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
    uid: "u9",
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
    uid: "u10",
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
    uid: "u11",
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
    uid: "u12",
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
    uid: "u13",
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
    uid: "u14",
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
    uid: "u15",
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
    uid: "u16",
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
    uid: "u17",
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
    uid: "u18",
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
    uid: "u19",
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
    uid: "u20",
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
    uid: "u21",
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
    uid: "u22",
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
    uid: "u23",
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
    uid: "u24",
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
    uid: "u25",
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
    uid: "u26",
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
