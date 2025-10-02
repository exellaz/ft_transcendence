import type { ApiResponse } from "./apiResponse";
import type { User } from "./usersApi";

export enum FriendshipStatus {
  PENDING = "pending",
  ACCEPTED = "accepted"
}

export interface Friendship {
	id: number;
	requesterId: number;
	accepterId: number;
	status: FriendshipStatus;
	createdAt: Date;
	updatedAt: Date;
	user: User;
}

export interface BlockedFriendship {
	id: number;
	blockerId: number;
	blockedId: number;
	createdAt: Date;
}

// ----------------------- API ENDPOINTS -------------------------

// GET /friendships/:userId/pending (get friends that send friend request to u)
export interface GetPendingFriendshipsRequest {
	userId: number;
}

export interface GetUserResponse extends ApiResponse<Friendship> {}

// GET /friendships/:userId/accepted

// POST /friendships

// PATCH /friendships/:requesterId/:accepterId

// DELETE /friendships/:requesterId/:accepterId
