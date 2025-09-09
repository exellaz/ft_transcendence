import React, { useState } from "react";
import type { SocialUser } from "./SocialHub";
import Button from "./Button";
import ProfileContents from "./ProfileContents";
import Messaging from "./Messaging";

interface CascadeCardProps {
  selectedUser: SocialUser;
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
  const handleActionClick = (type) => {
    setActionType(type);
    setShowConfirm(true);
    setActionDone(false);
  };

  // Handler for confirmation
  const handleConfirm = (yes) => {
    if (yes) {
      setActionDone(true);
    } else {
      setShowConfirm(false);
      setActionType("");
    }
  };

  return (
    <div className="w-[450px] border-gray-300 border-3 rounded-3xl flex flex-col items-center justify-center shadow-lg animate-slide-in">
      {activeTab === "Friends" &&
        (showProfile ? (
          <div className="flex flex-col items-center w-full">
            <ProfileContents user={selectedUser.profile} />
            <div className="flex gap-6 mt-6">
              <Button
                variant="yellow"
                className="flex-1"
                onClick={() => setShowProfile(false)}
              >
                Back to Chat
              </Button>
              <Button variant="red" className="flex-1">
                Block
              </Button>
            </div>
          </div>
        ) : (
          <Messaging
            recipient={selectedUser}
            messages={selectedUser.messages}
            onProfileClick={() => setShowProfile(true)}
          />
        ))}
      {(activeTab === "Requests" || activeTab === "Blocked") && (
        <div className="flex flex-col items-center w-full">
          {/* Confirmation dialog */}
          {showConfirm ? (
            !actionDone ? (
              <div className="flex flex-col items-center justify-center w-full p-8">
                <div className="text-center text-lg font-bold mb-6 text-white">
                  {actionType === "block"
                    ? `Are you sure you want to block ${selectedUser.username}?`
                    : `Are you sure you want to unblock ${selectedUser.username}?`}
                </div>
                <div className="flex gap-6">
                  <Button variant="yellow" onClick={() => handleConfirm(true)}>
                    Yes
                  </Button>
                  <Button variant="red" onClick={() => handleConfirm(false)}>
                    No
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full p-8">
                <div className="text-center text-lg font-bold mb-6 text-white">
                  {actionType === "block"
                    ? `${selectedUser.username} has been blocked.`
                    : `${selectedUser.username} has been unblocked.`}
                </div>
              </div>
            )
          ) : (
            <>
              <ProfileContents user={selectedUser.profile} />
              {activeTab === "Requests" && (
                <Button
                  variant="red"
                  className="mt-6"
                  onClick={() => handleActionClick("block")}
                >
                  Block
                </Button>
              )}
              {activeTab === "Blocked" && (
                <Button
                  variant="red"
                  className="mt-6"
                  onClick={() => handleActionClick("unblock")}
                >
                  Unblock
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CascadeCard;
