import React, { useState } from "react";

import Avatar from "./Avatar";
import BlockedTile from "./BlockedTile";
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
              key={tab}
              className={`text-lg font-bold pb-2 px-4 transition-colors ${
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
              <div className="flex sticky top-0 bg-card-blue">
                <Input icon={<img src="/assets/search.png" alt="search.png" className="w-10" />} placeholder="Search friend" />
              </div>
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
                />
              ))}
            </div>
          )}
          {/* Requests Tab */}
          {activeTab === "Requests" && (
            <div className="flex flex-col gap-4">
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
                />
              ))}
            </div>
          )}
          {/* Blocked Tab */}
          {activeTab === "Blocked" && (
            <div className="grid grid-cols-3 gap-4">
              {users.map((user) => (
                <BlockedTile
                  username={user.username}
                  avatarUrl={user.avatarUrl}
                  onClick={() =>
                    selectedUser?.uid === user.uid
                      ? setSelectedUser(null)
                      : setSelectedUser(user)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Extended View: Cascade Card */}
      {selectedUser && (
        <div className="w-[450px] bg-input-gray rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg animate-slide-in">
          <Avatar src={selectedUser.avatarUrl} size={80} />
          <span className="text-white font-bold text-2xl mb-4 mt-2">
            {selectedUser.username}
          </span>
          {activeTab === "Friends" && (
            <>
              <button className="bg-yellow-400 text-black font-bold rounded-full px-6 py-2 mb-2">
                View Profile
              </button>
              <button className="bg-yellow-400 text-black font-bold rounded-full px-6 py-2 mb-2">
                View Chat
              </button>
              <button className="bg-red-500 text-white font-bold rounded-full px-6 py-2">
                Block
              </button>
            </>
          )}
          {activeTab === "Blocked" && (
            <>
              <button className="bg-yellow-400 text-black font-bold rounded-full px-6 py-2 mb-2">
                View Profile
              </button>
              <button className="bg-green-500 text-white font-bold rounded-full px-6 py-2">
                Unblock
              </button>
            </>
          )}
          {activeTab === "Requests" && (
            <>
              <button className="bg-green-500 text-white font-bold rounded-full px-6 py-2 mb-2">
                Approve
              </button>
              <button className="bg-red-500 text-white font-bold rounded-full px-6 py-2">
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialHub;
