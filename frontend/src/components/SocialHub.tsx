import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// import { useUser } from "../context/UserContext";
import type {
  FriendBasic,
  FriendRequest,
  BlockedUser,
} from "../types/apiInterfaces";
// TODO: Remove mock data import when integrating real API
import { mockFriends, mockRequests, mockBlocked } from "../data/mockUsers";

import BlockedTile from "./BlockedTile";
import Button from "./Button";
import CascadeCard from "./CascadeCard";
import FriendTile from "./FriendTile";
import FriendRequestTile from "./FriendRequestTile";
import Input from "./Input";

interface SocialHubProps {
  selectedUser: FriendBasic | FriendRequest | BlockedUser | null;
  setSelectedUser: (
    user: FriendBasic | FriendRequest | BlockedUser | null
  ) => void;
}

const SocialHub: React.FC<SocialHubProps> = ({
  selectedUser,
  setSelectedUser,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SocialHub.${key}`);
  const tabs = ["friends", "requests", "blocked"];
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState<FriendBasic[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  // Add Friend state
  const [showAddFriendView, setShowAddFriendView] = useState(false);
  const [friendUID, setFriendUID] = useState("");
  const [addFriendStatus, setAddFriendStatus] = useState<
    null | "success" | "error"
  >(null);

  // TODO: Fetch real data based on userUid
  // const userUID = useUser().user?.id;
  // React.useEffect(() => {
  //   // Replace with real API calls
  //   fetch(`/api/friends?uid=${userUid}`)
  //     .then((res) => res.json())
  //     .then(setFriends);
  //   fetch(`/api/requests?uid=${userUid}`)
  //     .then((res) => res.json())
  //     .then(setRequests);
  //   fetch(`/api/blocked?uid=${userUid}`)
  //     .then((res) => res.json())
  //     .then(setBlocked);
  // }, [userUid]);

  // TODO: Remove mock data when integrating real API
  React.useEffect(() => {
    setFriends(mockFriends);
    setRequests(mockRequests);
    setBlocked(mockBlocked);
  }, []);

  function handleAddFriend() {
    // Simulate UID check
    const exists = friends.some((f) => f.uid === friendUID);
    if (exists) {
      setAddFriendStatus("success");
      setFriendUID("");
    } else {
      setAddFriendStatus("error");
    }
  }

  return (
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
                        {translate("enter_friend_uid")}
                      </p>
                      <Input
                        placeholder={translate("enter_uid")}
                        value={friendUID}
                        onChange={(e) => setFriendUID(e.target.value)}
                      />
                      {addFriendStatus === "success" && (
                        <p className="text-green-400">
                          {translate("friend_added")}
                        </p>
                      )}
                      {addFriendStatus === "error" && (
                        <p className="text-red-400">
                          {translate("uid_not_exist")}
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
                          key={user.uid}
                          username={user.username}
                          avatarUrl={user.avatarUrl}
                          lastMessage={user.lastMessage}
                          timestamp={user.lastMessageTimestamp}
                          online={user.online}
                          onClick={() =>
                            selectedUser?.uid === user.uid
                              ? setSelectedUser(null)
                              : setSelectedUser(user)
                          }
                          active={selectedUser?.uid === user.uid}
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
                      key={user.uid}
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                      onAccept={() => alert("Friend request accepted!")}
                      onReject={() => alert("Friend request rejected!")}
                      onClick={() =>
                        selectedUser?.uid === user.uid
                          ? setSelectedUser(null)
                          : setSelectedUser(user)
                      }
                      active={selectedUser?.uid === user.uid}
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
                      key={user.uid}
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                      onClick={() =>
                        selectedUser?.uid === user.uid
                          ? setSelectedUser(null)
                          : setSelectedUser(user)
                      }
                      active={selectedUser?.uid === user.uid}
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
  );
};

export default SocialHub;
