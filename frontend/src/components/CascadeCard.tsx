import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApiMutation } from "../hooks/useApi";
import {
  createBlockedFriendship,
  deleteBlockedFriendship,
} from "../lib/friendsApiClient";
import type { User } from "../types/usersApi";

import Button from "./Button";
import ProfileContents from "./ProfileContents";
import Messaging from "./Messaging";

interface CascadeCardProps {
  userId: number;
  selectedUser: User;
  friendshipId?: number;
  activeTab: string;
  onActionSuccess: () => void;
}

const CascadeCard: React.FC<CascadeCardProps> = ({
  userId,
  selectedUser,
  friendshipId,
  activeTab,
  onActionSuccess,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`CascadeCard.${key}`);
  const [showProfile, setShowProfile] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState("");

  // API mutation to block a user
  const { mutate: blockUser } = useApiMutation(createBlockedFriendship);

  // API mutation to unblock a user
  const { mutate: unblockUser } = useApiMutation(deleteBlockedFriendship);

  // Handler for block/unblock button click
  const handleActionClick = (type: "block" | "unblock") => {
    setActionType(type);
    setShowConfirm(true);
  };

  // Handler for action confirmation
  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmed) {
      setShowConfirm(false);
      setActionType("");
      return;
    }
    if (actionType === "block") {
      const block = await blockUser({
        blockerId: userId,
        blockedId: selectedUser.id,
      });
      if (block.success) {
        alert(
          t("CascadeCard.blocked", {
            username: selectedUser.username,
          }),
        );
        onActionSuccess();
      }
    } else if (actionType === "unblock") {
      const unblock = await unblockUser({
        blockerId: userId,
        blockedId: selectedUser.id,
      });
      if (unblock.success) {
        alert(
          t("CascadeCard.unblocked", {
            username: selectedUser.username,
          }),
        );
        onActionSuccess();
      }
    }
  };

  let children: React.ReactNode;
  const textStyle = "text-center text-lg font-bold text-white";

  // Confirmation dialog (all tabs)
  if (showConfirm) {
    children = (
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
  }
  // Profile view (Friends tab if showProfile, Requests, Blocked)
  else if (
    (activeTab === "friends" && showProfile) ||
    activeTab === "requests" ||
    activeTab === "blocked"
  ) {
    children = (
      <div className="w-full h-full flex-col-between p-10">
        <ProfileContents selectedId={selectedUser.id} />
        {activeTab === "friends" && (
          <div className="flex-row-center gap-6">
            <Button onClick={() => setShowProfile(false)}>
              {translate("back_to_chat")}
            </Button>
            <Button variant="red" onClick={() => handleActionClick("block")}>
              {translate("block")}
            </Button>
          </div>
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
    children = (
      <Messaging
        userId={userId}
        selectedUser={selectedUser}
        friendshipId={friendshipId!}
        onProfileClick={() => setShowProfile(true)}
      />
    );
  }

  return (
    <div className="w-[400px] border-gray-300 border-3 rounded-3xl">
      {children}
    </div>
  );
};

export default CascadeCard;
