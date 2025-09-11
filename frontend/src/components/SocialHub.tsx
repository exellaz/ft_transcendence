import React, { useState } from "react";
// import { useUser } from "../context/UserContext";
import type {
  FriendBasic,
  FriendRequest,
  BlockedUser,
} from "../types/socialTypes";
// TODO: Remove mock data import when integrating real API
import { mockFriends, mockRequests, mockBlocked } from "../data/mockUsers";

import BlockedTile from "./BlockedTile";
import Button from "./Button";
import CascadeCard from "./CascadeCard";
import FriendTile from "./FriendTile";
import FriendRequestTile from "./FriendRequestTile";
import Input from "./Input";

const tabs = ["Friends", "Requests", "Blocked"];

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
  const [activeTab, setActiveTab] = useState("Friends");
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
    <div className="flex flex-row w-full h-full gap-6">
      {/* Main View: Tabs and List */}
      <div className="flex flex-col w-[450px] items-center py-2">
        {/* Tabs Header (fixed) */}
        <div className="flex gap-6 border-b border-yellow-400 mb-6">
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
              {tab}
            </button>
          ))}
        </div>
        {/* Scrollable Content */}
        <div className="w-full overflow-y-auto scrollbar-hide">
          {(() => {
            if (activeTab === "Friends") {
              if (showAddFriendView) {
                return (
                  // Add Friend View
                  <div className="flex flex-col gap-10 items-center justify-center">
                    <div className="w-full border-gray-300 border-3 rounded-3xl p-10 flex flex-col gap-10 items-center justify-center">
                      <h2 className="text-white text-xl font-bold">
                        Enter friend UID
                      </h2>
                      <Input
                        placeholder="Enter UID"
                        value={friendUID}
                        onChange={(e) => setFriendUID(e.target.value)}
                        className="w-full max-w-xs"
                      />
                      {addFriendStatus === "success" && (
                        <p className="text-green-400">Friend has been added.</p>
                      )}
                      {addFriendStatus === "error" && (
                        <p className="text-red-400">UID does not exist.</p>
                      )}
                      <Button variant="yellow" onClick={handleAddFriend}>
                        Add Friend
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
                      Back
                    </Button>
                  </div>
                );
              } else {
                return (
                  // Friends List View
                  <div className="flex flex-col">
                    {/* Search Bar & Add Friend Button */}
                    <div className="sticky top-0 flex items-center gap-2 bg-card-blue pb-3">
                      <div className="flex-2">
                        <Input
                          icon={
                            <img
                              src="/assets/search.png"
                              alt="search.png"
                              className="w-10"
                            />
                          }
                          placeholder="Search friend"
                        />
                      </div>
                      <Button
                        variant="yellow"
                        className="flex-1"
                        onClick={() => {
                          setShowAddFriendView(true);
                          setAddFriendStatus(null);
                        }}
                      >
                        Add Friend
                      </Button>
                    </div>
                    <div className="p-1 flex flex-col gap-4">
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
                  </div>
                );
              }
            } else if (activeTab === "Requests") {
              return (
                // Friend Requests List View
                <div className="flex flex-col gap-4 p-1">
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
            } else if (activeTab === "Blocked") {
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
