import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const translate = (key: string) => t(`CascadeCard.${key}`);
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
  const textStyle = "text-center text-lg font-bold text-white";

  // Confirmation dialog (all tabs)
  if (showConfirm) {
    if (!actionDone) {
      content = (
        <div className="w-full h-full flex-col-center p-10 gap-6">
          <div className={textStyle}>
            {actionType === "block"
              ? t("CascadeCard.confirm_block", {
                  username: selectedUser.username,
                })
              : t("CascadeCard.confirm_unblock", {
                  username: selectedUser.username,
                })}
          </div>
          <div className="flex-row-center gap-6">
            <Button variant="green" onClick={() => handleConfirm(true)}>
              {translate("yes")}
            </Button>
            <Button variant="red" onClick={() => handleConfirm(false)}>
              {translate("no")}
            </Button>
          </div>
        </div>
      );
    } else {
      content = (
        <div className="w-full h-full flex-col-center p-10 gap-6">
          <div className={textStyle}>
            {actionType === "block"
              ? t("CascadeCard.blocked", { username: selectedUser.username })
              : t("CascadeCard.unblocked", { username: selectedUser.username })}
          </div>
        </div>
      );
    }
  }
  // Profile view (Friends tab if showProfile, Requests, Blocked)
  else if (
    (activeTab === "friends" && showProfile) ||
    activeTab === "requests" ||
    activeTab === "blocked"
  ) {
    content = (
      <div className="w-full h-full flex-col-between p-10">
        <ProfileContents userUid={selectedUser.uid} />
        {activeTab === "friends" && (
          <div className="flex-row-center gap-6">
            <Button variant="yellow" onClick={() => setShowProfile(false)}>
              {translate("back_to_chat")}
            </Button>
            <Button variant="red" onClick={() => handleActionClick("block")}>
              {translate("block")}
            </Button>
          </div>
        )}
        {activeTab === "requests" && (
          <Button variant="red" onClick={() => handleActionClick("block")}>
            {translate("block")}
          </Button>
        )}
        {activeTab === "blocked" && (
          <Button variant="red" onClick={() => handleActionClick("unblock")}>
            {translate("unblock")}
          </Button>
        )}
      </div>
    );
  }
  // Messaging view (Friends tab, default)
  else if (activeTab === "friends" && !showProfile) {
    content = (
      <Messaging
        friendBasic={selectedUser as FriendBasic}
        friendUid={selectedUser.uid}
        onProfileClick={() => setShowProfile(true)}
      />
    );
  }

  return (
    <div className="w-[450px] border-gray-300 border-3 rounded-3xl">
      {content}
    </div>
  );
};

export default CascadeCard;
