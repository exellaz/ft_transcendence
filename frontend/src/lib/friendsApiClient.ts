import type {
  CreateBlockedFriendshipRequest,
  CreateBlockedFriendshipResponse,
  CreateFriendshipRequest,
  CreateFriendshipResponse,
  DeleteBlockedFriendshipRequest,
  DeleteBlockedFriendshipResponse,
  DeleteFriendshipRequest,
  DeleteFriendshipResponse,
  GetAcceptedFriendshipsRequest,
  GetAcceptedFriendshipsResponse,
  GetAllFriendChatMessagesRequest,
  GetAllFriendChatMessagesResponse,
  GetBlockedFriendshipsRequest,
  GetBlockedFriendshipsResponse,
  GetLastFriendChatMessageRequest,
  GetLastFriendChatMessageResponse,
  GetPendingFriendshipsRequest,
  GetPendingFriendshipsResponse,
  UpdateFriendshipRequest,
  UpdateFriendshipResponse,
} from "../types/friendsApi";

const VITE_API_URL = import.meta.env.VITE_API_URL;

// GET /friendships/:userId/pending (get friends that send friend request to u)
export async function getPendingFriendshipsByUserId({
  userId,
}: GetPendingFriendshipsRequest): Promise<GetPendingFriendshipsResponse> {
  const res = await fetch(`${VITE_API_URL}/friendships/${userId}/pending`, {
    method: "GET",
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
  });

  return res.json();
}

// GET /friendships/:userId/accepted
export async function getAcceptedFriendshipsByUserId({
  userId,
}: GetAcceptedFriendshipsRequest): Promise<GetAcceptedFriendshipsResponse> {
  const res = await fetch(`${VITE_API_URL}/friendships/${userId}/accepted`, {
    method: "GET",
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
  });

  return res.json();
}

// POST /friendships
export async function createFriendship(
  payload: CreateFriendshipRequest,
): Promise<CreateFriendshipResponse> {
  const res = await fetch(`${VITE_API_URL}/friendships`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// PATCH /friendships/:requesterId/:accepterId
export async function updateFriendship(
  payload: UpdateFriendshipRequest,
): Promise<UpdateFriendshipResponse> {
  const { requesterId, accepterId, ...data } = payload;
  const res = await fetch(
    `${VITE_API_URL}/friendships/${requesterId}/${accepterId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify(data),
    },
  );

  return res.json();
}

// DELETE /friendships/:requesterId/:accepterId
export async function deleteFriendship({
  requesterId,
  accepterId,
}: DeleteFriendshipRequest): Promise<DeleteFriendshipResponse> {
  const res = await fetch(
    `${VITE_API_URL}/friendships/${requesterId}/${accepterId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    },
  );

  return res.json();
}

// GET /blockedFriendships/:userId  (get all blocked friends by user)
export async function getBlockedFriendshipsByUserId({
  userId,
}: GetBlockedFriendshipsRequest): Promise<GetBlockedFriendshipsResponse> {
  const res = await fetch(`${VITE_API_URL}/blockedFriendships/${userId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
  });

  return res.json();
}

// POST /blockedFriendships
export async function createBlockedFriendship(
  payload: CreateBlockedFriendshipRequest,
): Promise<CreateBlockedFriendshipResponse> {
  const res = await fetch(`${VITE_API_URL}/blockedFriendships`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}
// DELETE /blockedFriendships/:blockerId/:blockedId - unblock (trusts frontend to place params correctly)
export async function deleteBlockedFriendship({
  blockerId,
  blockedId,
}: DeleteBlockedFriendshipRequest): Promise<DeleteBlockedFriendshipResponse> {
  const res = await fetch(
    `${VITE_API_URL}/blockedFriendships/${blockerId}/${blockedId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    },
  );

  return res.json();
}

// GET /friendChatMessages/:friendshipId
export async function getAllFriendChatMessages({
  friendshipId,
}: GetAllFriendChatMessagesRequest): Promise<GetAllFriendChatMessagesResponse> {
  const res = await fetch(
    `${VITE_API_URL}/friendChatMessages/${friendshipId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    },
  );

  return res.json();
}

// GET /friendChatMessages/:friendshipId/lastMessage
export async function getLastFriendChatMessage({
  friendshipId,
}: GetLastFriendChatMessageRequest): Promise<GetLastFriendChatMessageResponse> {
  const res = await fetch(
    `${VITE_API_URL}/friendChatMessages/${friendshipId}/lastMessage`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    },
  );

  return res.json();
}
