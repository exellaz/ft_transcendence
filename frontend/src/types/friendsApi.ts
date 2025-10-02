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

export interface GetPendingFriendshipsResponse extends ApiResponse<Friendship> {}

// GET /friendships/:userId/accepted
export interface GetAcceptedFriendshipsRequest {
	userId: number;
}

export interface GetAcceptedFriendshipsResponse extends ApiResponse<Friendship> {}

// POST /friendships
export interface CreateFriendshipRequest {
	requesterId: number;
	accepterId: number;
}

export interface CreateFriendshipResponse extends ApiResponse<Friendship> {}

// PATCH /friendships/:requesterId/:accepterId
export interface UpdateFriendshipRequest {
	requesterId: number;
	accepterId: number;
	status?: FriendshipStatus; // optional
}

export interface UpdateFriendshipResponse extends ApiResponse<Friendship> {}

// DELETE /friendships/:requesterId/:accepterId
export interface DeleteFriendshipRequest {
	requesterId: number;
	accepterId: number;
}

export interface DeleteFriendshipResponse extends ApiResponse<Friendship> {}
