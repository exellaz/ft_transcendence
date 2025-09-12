import React, { useState } from "react";
import type {
  FriendBasic,
  FriendRequest,
  BlockedUser,
} from "../types/apiInterfaces";

import Button from "./Button";
import ProfileContents from "./ProfileContents";
import Messaging from "./Messaging";

interface CascadeCardProps {
  selectedUser: FriendBasic | FriendRequest | BlockedUser;
  activeTab: string;
}

const CascadeCard: React.FC<CascadeCardProps> = ({
  selectedUser,
  activeTab,
}) => {
  const [showProfile, setShowProfile] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState("");
  const [actionDone, setActionDone] = useState(false);

  // Handler for block/unblock button click
  const handleActionClick = (type: "block" | "unblock") => {
    setActionType(type);
    setShowConfirm(true);
    setActionDone(false);
  };

  // Handler for confirmation
  const handleConfirm = (yes: boolean) => {
    if (yes) {
      setActionDone(true);
    } else {
      setShowConfirm(false);
      setActionType("");
      setActionDone(false);
    }
  };

  let content;

  // Confirmation dialog (all tabs)
  if (showConfirm) {
    if (!actionDone) {
      content = (
        <div className="flex flex-col items-center justify-center w-full p-8">
          <div className="text-center text-lg font-bold mb-6 text-white">
            {actionType === "block"
              ? `Are you sure you want to block ${selectedUser.username}?`
              : `Are you sure you want to unblock ${selectedUser.username}?`}
          </div>
          <div className="flex gap-6">
            <Button variant="green" onClick={() => handleConfirm(true)}>
              Yes
            </Button>
            <Button variant="red" onClick={() => handleConfirm(false)}>
              No
            </Button>
          </div>
        </div>
      );
    } else {
      content = (
        <div className="flex flex-col items-center justify-center w-full p-8">
          <div className="text-center text-lg font-bold mb-6 text-white">
            {actionType === "block"
              ? `${selectedUser.username} has been blocked.`
              : `${selectedUser.username} has been unblocked.`}
          </div>
        </div>
      );
    }
  }
  // Profile view (Friends tab if showProfile, Requests, Blocked)
  else if (
    (activeTab === "Friends" && showProfile) ||
    activeTab === "Requests" ||
    activeTab === "Blocked"
  ) {
    content = (
      <div className="flex flex-col items-center w-full">
        <div className="mb-2">
          <ProfileContents userUid={selectedUser.uid} />
        </div>
        {activeTab === "Friends" && (
          <div className="flex gap-6">
            <Button
              variant="yellow"
              className="flex-1"
              onClick={() => setShowProfile(false)}
            >
              Back to Chat
            </Button>
            <Button
              variant="red"
              className="flex-1"
              onClick={() => handleActionClick("block")}
            >
              Block
            </Button>
          </div>
        )}
        {activeTab === "Requests" && (
          <Button variant="red" onClick={() => handleActionClick("block")}>
            Block
          </Button>
        )}
        {activeTab === "Blocked" && (
          <Button variant="red" onClick={() => handleActionClick("unblock")}>
            Unblock
          </Button>
        )}
      </div>
    );
  }
  // Messaging view (Friends tab, default)
  else if (activeTab === "Friends" && !showProfile) {
    content = (
      <Messaging
        friendBasic={selectedUser as FriendBasic}
        friendUid={selectedUser.uid}
        onProfileClick={() => setShowProfile(true)}
      />
    );
  }

  return (
    <div className="w-[450px] border-gray-300 border-3 rounded-3xl flex flex-col items-center justify-center shadow-lg animate-slide-in">
      {content}
    </div>
  );
};

export default CascadeCard;
