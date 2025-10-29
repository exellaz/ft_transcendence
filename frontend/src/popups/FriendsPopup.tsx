import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useApiQuery, useApiMutation } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "../context/OnlineStatusProvider";
import {
  createFriendship,
  deleteFriendship,
  getAcceptedFriendshipsByUserId,
  getBlockedFriendshipsByUserId,
  getLastFriendChatMessage,
  getPendingFriendshipsByUserId,
  updateFriendship,
} from "../lib/friendsApiClient";
import type { User } from "../types/usersApi";
import type {
  UserWithFriendshipId,
  FriendChatMessage,
} from "../types/friendsApi";

import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from "../components/ApiState";
import BlockedTile from "../components/BlockedTile";
import Button from "../components/Button";
import CascadeCard from "../components/CascadeCard";
import FriendRequestTile from "../components/FriendRequestTile";
import FriendTile from "../components/FriendTile";
import Input from "../components/Input";
import PopupCard from "../components/PopupCard";
import Status from "../components/Status";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userId: number;
}

const FriendsPopup: React.FC<PopupProps> = ({ open, onClose, userId }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`FriendsPopup.${key}`);

  const queryClient = useQueryClient();

  // Selected user and active tab states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const tabs = ["friends", "requests", "blocked"] as const;
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("friends");

  // Search bar state
  const [searchTerm, setSearchTerm] = useState("");

  // Add friend state
  const [showAddFriendView, setShowAddFriendView] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [addFriendError, setAddFriendError] = useState<string | null>(null);
  const [addFriendSuccess, setAddFriendSuccess] = useState(false);

  type LastMessage = {
    message: string;
    timestamp: Date;
  };
  const [lastMessages, setLastMessages] = useState<Record<number, LastMessage>>(
    {},
  );
  // maps userId to unread status boolean
  const [unreadMap, setUnreadMap] = useState<Record<number, boolean>>({});

  // API query for friends list
  const {
    data: friends,
    loading: friendsLoading,
    error: friendsError,
    refetch: refetchFriends,
  } = useApiQuery<UserWithFriendshipId[]>(
    () => getAcceptedFriendshipsByUserId({ userId: userId }),
    [open],
    userId !== 0,
  );

  // secondary API call to fetch last message for each friend
  // this API is independent so that we don't have to fetch the entire chat history
  // if the Messaging component is never opened.
  useEffect(() => {
    if (!friends || friends.length === 0) return;

    let isMounted = true;

    const fetchLastMessages = async () => {
      const results: Record<number, LastMessage> = {};

      // run all API calls in parallel
      // friends.map(...) creates an array of promises
      // Promise.all([...]) takes that array of promises and runs them all concurrently,
      // then waits for all of them to finish.
      await Promise.all(
        friends.map(async (friend) => {
          try {
            const res = await getLastFriendChatMessage({
              friendshipId: friend.friendshipId,
            });
            if (res.success && res.data) {
              results[friend.friendshipId] = {
                message: res.data.message,
                timestamp: res.data.timestamp,
              };
            }
          } catch (err) {
            console.error(
              "Error fetching last message for",
              friend.username,
              err,
            );
          }
        }),
      );

      if (isMounted) setLastMessages(results);
    };

    fetchLastMessages();

    return () => {
      isMounted = false;
    };
  }, [friends]);

  // update last message when FRIEND_MESSAGE or MESSAGE_ACK received
  useEffect(() => {
    const handler = (event: Event) => {
      const msg = (event as CustomEvent<FriendChatMessage>).detail;

      // update last message
      setLastMessages((prev) => ({
        ...prev,
        [msg.friendshipId]: {
          message: msg.message,
          timestamp: msg.timestamp,
        },
      }));

      // mark sender as unread
      setUnreadMap((prev) => ({
        ...prev,
        [msg.senderId]: true,
      }));
    };

    window.addEventListener("updateLastMessage", handler);
    return () => window.removeEventListener("updateLastMessage", handler);
  }, []);

  // update last message when Messaging component refetches messages
  useEffect(() => {
    // listen for query cache update
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type !== "updated") return;

      const query = event.query;
      // check that query.queryKey[] is an array for safe destructuring
      // ["friendMessages", 1] → FriendChatMessage[]
      // ["friendMessages", 2] → FriendChatMessage[]
      if (!Array.isArray(query.queryKey)) return;
      // Only care about friendMessages queries
      if (query.queryKey[0] !== "friendMessages") return;

      const [, friendshipId] = query.queryKey;
      const messages = query.state.data as FriendChatMessage[] | undefined;
      if (!messages || messages.length === 0) return;

      // gets last message from the cache
      const last = messages[messages.length - 1];
      setLastMessages((prev) => ({
        ...prev,
        [friendshipId]: {
          message: last.message,
          timestamp: last.timestamp,
        },
      }));
    });

    // cleanup function - similar logic to removeEventListener
    return () => unsubscribe();
  }, [queryClient]);

  // useMemo lets you cache the result of an expensive computation
  // and only recompute it when certain dependencies change.
  // prevents sorting and filtering every time the popup is opened.
  const sortedFilteredFriends = useMemo(() => {
    if (!friends) return [];
    return (
      [...friends]
        // filters friends list based on search term
        .filter((user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        // sort friend list by timestamp and username
        .sort((a, b) => {
          const lastA = lastMessages[a.friendshipId];
          const lastB = lastMessages[b.friendshipId];

          // If both have timestamps, most recent first
          if (lastA?.timestamp && lastB?.timestamp) {
            return (
              new Date(lastB.timestamp).getTime() -
              new Date(lastA.timestamp).getTime()
            );
          }

          // If only one has timestamp, that one goes first
          if (lastA?.timestamp && !lastB?.timestamp) return -1;
          if (!lastA?.timestamp && lastB?.timestamp) return 1;

          // Otherwise, sort alphabetically by username
          return a.username.localeCompare(b.username);
        })
    );
  }, [friends, lastMessages, searchTerm]);

  // API query for friend requests list
  const {
    data: requests,
    loading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useApiQuery<User[]>(
    () => getPendingFriendshipsByUserId({ userId: userId }),
    [open],
    userId !== 0,
  );

  // API query for blocked users list
  const {
    data: blocked,
    loading: blockedLoading,
    error: blockedError,
    refetch: refetchBlocked,
  } = useApiQuery<User[]>(
    () => getBlockedFriendshipsByUserId({ userId: userId }),
    [open],
    userId !== 0,
  );

  // API mutation to add a friend
  const { mutate: addFriend } = useApiMutation(createFriendship);

  // API mutation to accept a friend request
  const { mutate: acceptRequest } = useApiMutation(updateFriendship);

  // API call to reject a friend request
  const { mutate: rejectRequest } = useApiMutation(deleteFriendship);

  function handleClose() {
    onClose();
    setSelectedUser(null);
    setAddFriendError(null);
    setAddFriendSuccess(false);
  }

  function handleCloseCascadeCard() {
    setSelectedUser(null);
    if (activeTab === "friends") {
      refetchFriends();
    } else if (activeTab === "requests") {
      refetchRequests();
    } else if (activeTab === "blocked") {
      refetchBlocked();
    }
  }

  const handleFriendUsernameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setFriendUsername(e.target.value);
    if (addFriendError) setAddFriendError(null);
    if (addFriendSuccess) setAddFriendSuccess(false);
  };

  const handleAddFriend = async (): Promise<void> => {
    // clear previous errors
    setAddFriendError(null);
    setAddFriendSuccess(false);

    const trimmed = friendUsername.trim();

    // return if input is empty
    if (trimmed === "") {
      setAddFriendError(translate("enter_valid_username"));
      return;
    }

    try {
      const response = await addFriend({
        requesterId: userId,
        accepterUsername: trimmed,
      });

      const errorMessages: Record<string, string> = {
        USER_NOT_FOUND: translate("user_not_found"),
        FRIEND_REQUEST_PENDING: translate("friend_request_pending"),
        ALREADY_FRIENDS: translate("already_friends"),
        FRIENDSHIP_CONFLICT: translate("friendship_conflict"),
        CANNOT_FRIEND_SELF: translate("cannot_friend_self"),
      };

      if (!response.success || !response.data) {
        setAddFriendError(
          response.errorCode && typeof response.errorCode === "string"
            ? errorMessages[response.errorCode] ||
                translate("add_friend_failed")
            : translate("add_friend_failed"),
        );
        return;
      }
      setAddFriendSuccess(true);
      handleCloseCascadeCard();
    } catch {
      setAddFriendError(translate("add_friend_failed"));
    }
  };

  const handleAcceptRequest = async (requesterId: number): Promise<void> => {
    const response = await acceptRequest({
      requesterId: requesterId,
      accepterId: userId,
      status: "accepted",
    });
    if (response.success) {
      handleCloseCascadeCard();
    }
  };

  const handleRejectRequest = async (requesterId: number): Promise<void> => {
    const response = await rejectRequest({
      requesterId: requesterId,
      accepterId: userId,
    });
    if (response.success) {
      handleCloseCascadeCard();
    }
  };

  // Friends content
  let friendsContent: React.ReactNode;
  const { isFriendOnline } = useOnlineStatus();
  if (friendsLoading) {
    friendsContent = <LoadingState />;
  } else if (friendsError) {
    friendsContent = <ErrorState onRetry={refetchFriends} />;
  } else if (!friends) {
    friendsContent = <NotFoundState />;
  } else if (friends.length === 0) {
    friendsContent = (
      <div className="h-full flex-col-center">
        <p className="text-gray-400 text-lg font-semibold">
          {translate("no_friends_yet")}
        </p>
      </div>
    );
  } else {
    friendsContent = (
      <div className="flex-col-center gap-4 p-1">
        {sortedFilteredFriends.map((user) => {
          const last = lastMessages[user.friendshipId] ?? {
            message: translate("no_messages_yet"),
            timestamp: "",
          };
          return (
            <FriendTile
              key={user.username}
              username={user.username}
              avatarUrl={user.avatarUrl}
              lastMessage={
                last.message.length > 40
                  ? last.message.slice(0, 40) + "..."
                  : last.message
              }
              timestamp={last.timestamp}
              online={isFriendOnline(user.id)} // ! TO CHANGE
              onClick={() => {
                // clear unread when clicked
                setUnreadMap((prev) => ({
                  ...prev,
                  [user.id]: false,
                }));
                setSelectedUser(selectedUser === user ? null : user);
              }}
              active={selectedUser === user}
              unread={unreadMap[user.id]}
            />
          );
        })}
      </div>
    );
  }

  // Friend requests content
  let requestsContent: React.ReactNode;
  if (requestsLoading) {
    requestsContent = <LoadingState />;
  } else if (requestsError) {
    requestsContent = <ErrorState onRetry={refetchRequests} />;
  } else if (!requests) {
    requestsContent = <NotFoundState />;
  } else if (requests.length === 0) {
    requestsContent = (
      <div className="h-full flex-col-center">
        <p className="text-gray-400 text-lg font-semibold">
          {translate("no_new_requests")}
        </p>
      </div>
    );
  } else {
    requestsContent = (
      <div className="flex-col-center gap-4 p-1">
        {requests.map((user) => (
          <FriendRequestTile
            key={user.username}
            username={user.username}
            avatarUrl={user.avatarUrl}
            onAccept={() => handleAcceptRequest(user.id)}
            onReject={() => handleRejectRequest(user.id)}
            onClick={() =>
              selectedUser === user
                ? setSelectedUser(null)
                : setSelectedUser(user)
            }
            active={selectedUser === user}
          />
        ))}
      </div>
    );
  }

  // Blocked users content
  let blockedContent: React.ReactNode;
  if (blockedLoading) {
    blockedContent = <LoadingState />;
  } else if (blockedError) {
    blockedContent = <ErrorState onRetry={refetchBlocked} />;
  } else if (!blocked) {
    blockedContent = <NotFoundState />;
  } else if (blocked.length === 0) {
    blockedContent = (
      <div className="h-full flex-col-center">
        <p className="text-gray-400 text-lg font-semibold">
          {translate("no_blocked_users")}
        </p>
      </div>
    );
  } else {
    blockedContent = (
      <div className="grid grid-cols-3 gap-4 p-1">
        {blocked.map((user) => (
          <BlockedTile
            key={user.username}
            username={user.username}
            avatarUrl={user.avatarUrl}
            onClick={() =>
              selectedUser === user
                ? setSelectedUser(null)
                : setSelectedUser(user)
            }
            active={selectedUser === user}
          />
        ))}
      </div>
    );
  }

  return (
    <PopupCard
      open={open}
      onClose={handleClose}
      size={selectedUser ? "large" : "default"}
    >
      <div className="w-full h-full flex flex-row gap-10">
        {/* Main View: Tabs and List */}
        <div className="flex-1 flex-col-center gap-6">
          {/* Tabs Header (fixed) */}
          <div className="flex-1 flex-row-center gap-6 border-b border-yellow-400">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`text-lg font-bold pb-2 px-4 transition-colors cursor-pointer ${
                  activeTab === tab
                    ? "text-yellow-400 border-b-4 border-yellow-400"
                    : "text-white"
                }`}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedUser(null);
                  setShowAddFriendView(false);
                  setAddFriendError(null);
                  setAddFriendSuccess(false);
                  // trigger refetch based on tab
                  if (tab === "friends") {
                    refetchFriends();
                  } else if (tab === "requests") {
                    refetchRequests();
                  } else if (tab === "blocked") {
                    refetchBlocked();
                  }
                }}
              >
                {translate(`tabs.${tab}`)}
              </button>
            ))}
          </div>
          {/* Scrollable Content */}
          <div className="w-full h-full overflow-y-auto scrollbar-hide">
            {(() => {
              if (activeTab === "friends") {
                if (showAddFriendView) {
                  return (
                    // Add Friend View
                    <div className="h-full flex-col-around">
                      <div className="w-full h-[300px] flex-col-around rounded-3xl border-gray-300 border-3 p-10">
                        <p className="text-white text-xl font-bold">
                          {translate("enter_friend_username")}
                        </p>
                        <Input
                          value={friendUsername}
                          onChange={handleFriendUsernameChange}
                          maxLength={30}
                        />
                        {addFriendSuccess && (
                          <Status
                            text={translate("friend_added")}
                            color="green"
                          />
                        )}
                        {addFriendError && (
                          <Status text={addFriendError} color="red" />
                        )}
                        <Button onClick={handleAddFriend}>
                          {translate("add_friend")}
                        </Button>
                      </div>
                      <Button
                        variant="yellow"
                        onClick={() => {
                          setShowAddFriendView(false);
                          setSelectedUser(null);
                          setAddFriendError(null);
                          setAddFriendSuccess(false);
                        }}
                      >
                        {translate("back")}
                      </Button>
                    </div>
                  );
                } else {
                  return (
                    // Friends List View
                    <>
                      {/* Search Bar & Add Friend Button */}
                      <div className="sticky top-0 flex-row-center gap-4 bg-card-blue pb-3">
                        <Input
                          className="flex-2"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          icon={
                            <img
                              src="/assets/search.png"
                              alt="search.png"
                              className="w-10"
                            />
                          }
                          placeholder={translate("search_friend")}
                          maxLength={30}
                        />
                        <Button
                          variant="yellow"
                          className="flex-1"
                          onClick={() => {
                            setShowAddFriendView(true);
                          }}
                        >
                          {translate("add_friend")}
                        </Button>
                      </div>
                      {friendsContent}
                    </>
                  );
                }
              } else if (activeTab === "requests") {
                return (
                  // Friend Requests List View
                  <>{requestsContent}</>
                );
              } else if (activeTab === "blocked") {
                return (
                  // Blocked Users List View
                  <>{blockedContent}</>
                );
              }
            })()}
          </div>
        </div>
        {/* Extended View: Cascade Card */}
        {selectedUser && (
          <CascadeCard
            key={selectedUser.id} // <-- forces remount on user change
            userId={userId}
            selectedUser={selectedUser}
            friendshipId={(selectedUser as UserWithFriendshipId).friendshipId}
            activeTab={activeTab}
            onActionSuccess={handleCloseCascadeCard}
          />
        )}
      </div>
    </PopupCard>
  );
};

export default FriendsPopup;
