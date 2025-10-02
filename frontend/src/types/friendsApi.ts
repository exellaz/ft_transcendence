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

export interface GetPendingFriendshipsResponse extends ApiResponse<User[]> {}

// GET /friendships/:userId/accepted
export interface GetAcceptedFriendshipsRequest {
	userId: number;
}

export interface GetAcceptedFriendshipsResponse extends ApiResponse<User[]> {}

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

// GET /blockedFriendships/:userId  (get all blocked friends by user)
export interface GetBlockedFriendshipsRequest {
	userId: number;
}

export interface GetBlockedFriendshipsResponse extends ApiResponse<BlockedFriendship[]> {}

// POST /blockedFriendships
export interface CreateBlockedFriendshipRequest {
	userId: number;
}

export interface CreateBlockedFriendshipResponse extends ApiResponse<BlockedFriendship> {}

// DELETE /blockedFriendships/:blockerId/:blockedId - unblock (trusts frontend to place params correctly)
export interface DeleteBlockedFriendshipRequest {
	userId: number;
}

export interface DeleteBlockedFriendshipResponse extends ApiResponse<BlockedFriendship> {}
