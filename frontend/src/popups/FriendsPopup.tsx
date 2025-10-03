import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApiQuery, useApiMutation } from "../hooks/useApi";
import {
  createFriendship,
  getAcceptedFriendshipsByUserId,
  getPendingFriendshipsByUserId,
  updateFriendship,
} from "../lib/friendsApiClient";
import type { User } from "../types/usersApi";

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

  // Selected user and active tab states
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const tabs = ["friends", "requests", "blocked"];
  const [activeTab, setActiveTab] = useState("friends");

  // Search bar state
  const [searchTerm, setSearchTerm] = useState("");

  // Add friend state
  const [showAddFriendView, setShowAddFriendView] = useState(false);
  const [friendId, setFriendId] = useState("");
  const [addFriendSuccess, setAddFriendSuccess] = useState(false);
  const [addFriendError, setAddFriendError] = useState<string | null>(null);

  // API query for friends list
  const {
    data: friends,
    loading: friendsLoading,
    error: friendsError,
    refetch: refetchFriends,
  } = useApiQuery<User[]>(
    () => getAcceptedFriendshipsByUserId({ userId: userId }),
    [open]
  );

  // API query for friend requests list
  const {
    data: requests,
    loading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useApiQuery<User[]>(
    () => getPendingFriendshipsByUserId({ userId: userId }),
    [open]
  );

  // API mutation to add a friend
  const { mutate: addFriend } = useApiMutation(createFriendship);

  // API mutation to accept a friend request
  const { mutate: acceptRequest } = useApiMutation(updateFriendship);

  function handleClose() {
    onClose();
    setSelectedUserId(null);
    setAddFriendSuccess(false);
    setAddFriendError(null);
  }

  const handleFriendIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFriendId(e.target.value);
    if (addFriendError) setAddFriendError(null);
    if (addFriendSuccess) setAddFriendSuccess(false);
  };

  const handleAddFriend = async (): Promise<void> => {
    // clear previous errors
    setAddFriendSuccess(false);
    setAddFriendError(null);

    const trimmed = friendId.trim();

    // return if input is empty or not a number
    if (trimmed === "" || isNaN(Number(trimmed))) {
      setAddFriendError("Please enter a valid numeric ID");
      return;
    }

    const result = await addFriend({
      requesterId: userId,
      accepterId: Number(trimmed),
    });

    if (result.success) {
      setAddFriendSuccess(true);
    } else {
      setAddFriendError("Failed to add friend");
    }
    if (result.error) {
      setAddFriendError(result.error);
    }
  };

  const handleAcceptRequest = async (friendId: number): Promise<void> => {
    const result = await acceptRequest({
      requesterId: friendId,
      accepterId: userId,
      status: "accepted",
    });
    if (result.success) {
      refetchRequests();
    }
    alert("Friend request accepted!");
  };

  let children: React.ReactNode;
  if (friendsLoading || requestsLoading) children = <LoadingState />;
  else if (friendsError)
    children = <ErrorState error={friendsError} onRetry={refetchFriends} />;
  else if (requestsError)
    children = <ErrorState error={requestsError} onRetry={refetchRequests} />;
  else if (!friends || !requests) children = <NotFoundState />;
  else
    children = (
      <div className="w-full h-full flex flex-row gap-6">
        {/* Main View: Tabs and List */}
        <div className="flex-1 flex-col-center gap-6">
          {/* Tabs Header (fixed) */}
          <div className="flex-1 flex-row-center gap-6 border-b border-yellow-400">
            {tabs.map((tab) => (
              <button
                className={`text-lg font-bold pb-2 px-4 transition-colors cursor-pointer ${
                  activeTab === tab
                    ? "text-yellow-400 border-b-4 border-yellow-400"
                    : "text-white"
                }`}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedUserId(null);
                  setShowAddFriendView(false);
                  setAddFriendSuccess(false);
                  setAddFriendError(null);
                  // trigger refetch based on tab
                  if (tab === "friends") {
                    refetchFriends();
                  } else if (tab === "requests") {
                    refetchRequests();
                  } else if (tab === "blocked") {
                    // refetchBlocked();
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
                          value={friendId}
                          onChange={handleFriendIdChange}
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
                          setSelectedUserId(null);
                          setAddFriendSuccess(false);
                          setAddFriendError(null);
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
                      {friends.length === 0 ? (
                        <div className="h-full flex-col-center">
                          <p className="text-gray-400 text-lg font-semibold">
                            {translate("no_friends_yet")}
                          </p>
                        </div>
                      ) : (
                        <div className="flex-col-center gap-4 p-1">
                          {friends
                            // filters friends list based on search term
                            .filter((friend) =>
                              friend.username
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())
                            )
                            .map((friend) => (
                              <FriendTile
                                key={friend.id}
                                username={friend.username}
                                avatarUrl={friend.avatarUrl}
                                lastMessage={"friend.lastMessage"}
                                timestamp={"friend.lastMessageTimestamp"}
                                online={friend.status === "online"}
                                onClick={() =>
                                  selectedUserId === friend.id
                                    ? setSelectedUserId(null)
                                    : setSelectedUserId(friend.id)
                                }
                                active={selectedUserId === friend.id}
                              />
                            ))}
                        </div>
                      )}
                    </>
                  );
                }
              } else if (activeTab === "requests") {
                return (
                  // Friend Requests List View
                  <>
                    {requests.length === 0 ? (
                      <div className="h-full flex-col-center">
                        <p className="text-gray-400 text-lg font-semibold">
                          {translate("no_new_requests")}
                        </p>
                      </div>
                    ) : (
                      <div className="flex-col-center gap-4 p-1">
                        {requests.map((user) => (
                          <FriendRequestTile
                            key={user.id}
                            username={user.username}
                            avatarUrl={user.avatarUrl}
                            onAccept={() => handleAcceptRequest(user.id)}
                            onReject={() => alert("Friend request rejected!")}
                            onClick={() =>
                              selectedUserId === user.id
                                ? setSelectedUserId(null)
                                : setSelectedUserId(user.id)
                            }
                            active={selectedUserId === user.id}
                          />
                        ))}
                      </div>
                    )}
                  </>
                );
              }
              // else if (activeTab === "blocked") {
              //   return (
              //     // Blocked Users List View
              //     <div className="grid grid-cols-3 gap-4 p-1">
              //       {blocked.map((user) => (
              //         <BlockedTile
              //           key={user.id}
              //           username={user.username}
              //           avatarUrl={user.avatarUrl}
              //           onClick={() =>
              //             selectedUser?.id === user.id
              //               ? setSelectedUser(null)
              //               : setSelectedUser(user)
              //           }
              //           active={selectedUser?.id === user.id}
              //         />
              //       ))}
              //     </div>
              //   );
              // }
              else {
                return null;
              }
            })()}
          </div>
        </div>
        {/* Extended View: Cascade Card
        {selectedUserId && (
          <CascadeCard selectedUserId={selectedUserId} activeTab={activeTab} />
        )} */}
      </div>
    );

  return (
    <PopupCard
      open={open}
      onClose={handleClose}
      size={selectedUserId ? "large" : "default"}
    >
      {children}
    </PopupCard>
  );
};

export default FriendsPopup;
