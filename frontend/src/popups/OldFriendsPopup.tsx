import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// TODO: Remove mock data import when integrating real API
import type {
  FriendBasic,
  FriendRequest,
  BlockedUser,
} from "../types/apiInterfaces";
import { mockFriends, mockRequests, mockBlocked } from "../data/mockUsers";

import BlockedTile from "../components/BlockedTile";
import Button from "../components/Button";
import CascadeCard from "../components/CascadeCard";
import FriendTile from "../components/FriendTile";
import FriendRequestTile from "../components/FriendRequestTile";
import Input from "../components/Input";
import PopupCard from "../components/PopupCard";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userId: number;
}

const OldFriendsPopup: React.FC<PopupProps> = ({ open, onClose, userId }) => {
  // TODO: Replace with real data from context or props
  const [selectedUser, setSelectedUser] = useState<
    FriendBasic | BlockedUser | FriendRequest | null
  >(null);
  const { t } = useTranslation();
  const translate = (key: string) => t(`FriendsPopup.${key}`);
  const tabs = ["friends", "requests", "blocked"];
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState<FriendBasic[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  // Add Friend state
  const [showAddFriendView, setShowAddFriendView] = useState(false);
  const [friendId, setFriendId] = useState("");
  const [addFriendStatus, setAddFriendStatus] = useState<
    null | "success" | "error"
  >(null);

  function handleClose() {
    onClose();
    setSelectedUser(null);
  }

  // TODO: Remove mock data when integrating real API
  React.useEffect(() => {
    setFriends(mockFriends);
    setRequests(mockRequests);
    setBlocked(mockBlocked);
  }, []);

  function handleAddFriend() {
    // Simulate ID check
    const exists = friends.some((f) => f.id.toString() === friendId);
    if (exists) {
      setAddFriendStatus("success");
      setFriendId("");
    } else {
      setAddFriendStatus("error");
    }
  }

  return (
    <PopupCard
      open={open}
      onClose={handleClose}
      size={selectedUser ? "large" : "default"}
    >
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
                  setSelectedUser(null);
                  setShowAddFriendView(false);
                  setAddFriendStatus(null);
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
                          onChange={(e) => setFriendId(e.target.value)}
                        />
                        {addFriendStatus === "success" && (
                          <p className="text-green-400">
                            {translate("friend_added")}
                          </p>
                        )}
                        {addFriendStatus === "error" && (
                          <p className="text-red-400">
                            {translate("username_not_exist")}
                          </p>
                        )}
                        <Button onClick={handleAddFriend}>
                          {translate("add_friend")}
                        </Button>
                      </div>
                      <Button
                        variant="yellow"
                        onClick={() => {
                          setShowAddFriendView(false);
                          setAddFriendStatus(null);
                          setSelectedUser(null);
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
                            setAddFriendStatus(null);
                          }}
                        >
                          {translate("add_friend")}
                        </Button>
                      </div>
                      <div className="flex-col-center gap-4 p-1">
                        {friends.map((user) => (
                          <FriendTile
                            key={user.id}
                            username={user.username}
                            avatarUrl={user.avatarUrl}
                            lastMessage={user.lastMessage}
                            timestamp={user.lastMessageTimestamp}
                            online={user.online}
                            onClick={() =>
                              selectedUser?.id === user.id
                                ? setSelectedUser(null)
                                : setSelectedUser(user)
                            }
                            active={selectedUser?.id === user.id}
                          />
                        ))}
                      </div>
                    </>
                  );
                }
              } else if (activeTab === "requests") {
                return (
                  // Friend Requests List View
                  <div className="flex-col-center gap-4 p-1">
                    {requests.map((user) => (
                      <FriendRequestTile
                        key={user.id}
                        username={user.username}
                        avatarUrl={user.avatarUrl}
                        onAccept={() => alert("Friend request accepted!")}
                        onReject={() => alert("Friend request rejected!")}
                        onClick={() =>
                          selectedUser?.id === user.id
                            ? setSelectedUser(null)
                            : setSelectedUser(user)
                        }
                        active={selectedUser?.id === user.id}
                      />
                    ))}
                  </div>
                );
              } else if (activeTab === "blocked") {
                return (
                  // Blocked Users List View
                  <div className="grid grid-cols-3 gap-4 p-1">
                    {blocked.map((user) => (
                      <BlockedTile
                        key={user.id}
                        username={user.username}
                        avatarUrl={user.avatarUrl}
                        onClick={() =>
                          selectedUser?.id === user.id
                            ? setSelectedUser(null)
                            : setSelectedUser(user)
                        }
                        active={selectedUser?.id === user.id}
                      />
                    ))}
                  </div>
                );
              } else {
                return null;
              }
            })()}
          </div>
        </div>
        {/* Extended View: Cascade Card */}
        {selectedUser && (
          <CascadeCard selectedUser={selectedUser} activeTab={activeTab} />
        )}
      </div>
    </PopupCard>
  );
};

export default OldFriendsPopup;
