import React, { useState } from "react";

import Avatar from "./Avatar";
import FriendTile from "./FriendTile";

export interface SocialUser {
  uid: string;
  username: string;
  avatarUrl: string;
  lastMessage?: string;
  timestamp?: string;
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
    <div className="flex flex-row w-full h-full">
      {/* Main View: Tabs and List */}
      <div className="flex flex-col w-full h-full items-center p-4">
        {/* Tabs Header (fixed) */}
        <div className="flex gap-6 border-b border-yellow-400 mb-6 sticky">
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
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
          {/* Friends Tab */}
          {activeTab === "Friends" && (
            <div className="flex flex-col gap-4">
              {/* TODO: Add search bar and add friend button here */}
              {users.map((user) => (
                <FriendTile
                  key={user.uid}
                  username={user.username}
                  avatarUrl={user.avatarUrl}
                  lastMessage={user.lastMessage}
                  timestamp={user.timestamp}
                  onClick={() => setSelectedUser(user)}
                />
              ))}
            </div>
          )}
          {/* Requests Tab */}
          {activeTab === "Requests" && (
            <div className="flex flex-col gap-4">
              {users.map((user) => (
                <div
                  key={user.uid}
                  className="bg-blue-900 rounded-xl p-4 flex items-center gap-4"
                >
                  <Avatar src={user.avatarUrl} size={48} />
                  <span className="text-white font-bold flex-1">
                    {user.username}
                  </span>
                  <button className="bg-green-500 text-white font-bold rounded-full px-4 py-1 mr-2">
                    ✓
                  </button>
                  <button className="bg-red-500 text-white font-bold rounded-full px-4 py-1">
                    ✗
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Blocked Tab */}
          {activeTab === "Blocked" && (
            <div className="grid grid-cols-3 gap-4">
              {users.map((user) => (
                <div
                  key={user.uid}
                  className="bg-blue-900 rounded-xl p-4 flex flex-col items-center cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
                  onClick={() => setSelectedUser(user)}
                >
                  <Avatar src={user.avatarUrl} size={48} />
                  <span className="text-white font-bold mt-2">
                    {user.username}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Extended View: Cascade Card */}
      {selectedUser && (
        <div className="flex-1 bg-blue-800 rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg animate-slide-in ml-6">
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
