import React, { useState } from "react";
import type { UserProfile } from "../context/User";

import BlockedTile from "./BlockedTile";
import Button from "./Button";
import CascadeCard from "./CascadeCard";
import FriendTile from "./FriendTile";
import FriendRequestTile from "./FriendRequestTile";
import Input from "./Input";

export interface SocialUser {
  uid: string;
  username: string;
  avatarUrl: string;
  lastMessage?: string;
  timestamp?: string;
  online?: boolean;
  profile: UserProfile;
  messages: any[];
}

interface SocialHubProps {
  friends: SocialUser[];
  requests: SocialUser[];
  blocked: SocialUser[];
  selectedUser: SocialUser | null;
  setSelectedUser: (user: SocialUser | null) => void;
}

const tabs = ["Friends", "Requests", "Blocked"];

const SocialHub: React.FC<SocialHubProps> = ({
  friends,
  requests,
  blocked,
  selectedUser,
  setSelectedUser,
}) => {
  const [activeTab, setActiveTab] = useState("Friends");

  let users: SocialUser[] = [];
  if (activeTab === "Friends") users = friends;
  if (activeTab === "Requests") users = requests;
  if (activeTab === "Blocked") users = blocked;

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
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Scrollable Content */}
        <div className="w-full overflow-y-auto scrollbar-hide">
          {/* Friends Tab */}
          {activeTab === "Friends" && (
            <div className="flex flex-col gap-4">
              {/* Search Bar & Add Friend Button */}
              <div className="sticky top-0 flex items-center gap-2 -mb-5 bg-card-blue">
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
                <Button variant="yellow" className="flex-1 mb-5">
                  Add Friend
                </Button>
              </div>
              <div className="my-1 p-1 flex flex-col gap-4">
                {users.map((user) => (
                  <FriendTile
                    key={user.uid}
                    username={user.username}
                    avatarUrl={user.avatarUrl}
                    lastMessage={user.lastMessage}
                    timestamp={user.timestamp}
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
          )}
          {/* Requests Tab */}
          {activeTab === "Requests" && (
            <div className="flex flex-col gap-4 p-1">
              {users.map((user) => (
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
          )}
          {/* Blocked Tab */}
          {activeTab === "Blocked" && (
            <div className="grid grid-cols-3 gap-4 p-1">
              {users.map((user) => (
                <BlockedTile
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
          )}
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
