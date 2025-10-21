import React from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../context/UserProvider";
import { useApiQuery, useApiMutation } from "../hooks/useApi";
import {
  createFriendship,
  getAcceptedFriendshipsByUserId,
  getBlockedFriendshipsByUserId,
  getPendingFriendshipsByUserId,
} from "../lib/friendsApiClient";
import type { User } from "../types/usersApi";

import Button from "../components/Button";
import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import ProfileContents from "../components/ProfileContents";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  selectedId: number;
  variant?: "self" | "other";
}

const ProfilePopup: React.FC<PopupProps> = ({
  open,
  onClose,
  selectedId,
  variant = "self",
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ProfilePopup.${key}`);
  const header =
    variant === "self" ? translate("header") : translate("header_other");

  const { user } = useUser();
  const userId = user?.id ?? 0;

  // API query for blocked users list
  const { data: blocked, loading: blockedLoading } = useApiQuery<User[]>(
    () => getBlockedFriendshipsByUserId({ userId: userId }),
    [open],
    userId !== 0 && variant === "other",
  );

  // API query for friends list
  const {
    data: friends,
    loading: friendsLoading,
    refetch: refetchFriends,
  } = useApiQuery<User[]>(
    () => getAcceptedFriendshipsByUserId({ userId: userId }),
    [open],
    userId !== 0 && variant === "other",
  );

  // API query for friend requests list
  // parameter is selectedId because we want to check if the user has sent a friend request before
  const { data: requests, loading: requestsLoading } = useApiQuery<User[]>(
    () => getPendingFriendshipsByUserId({ userId: selectedId }),
    [open],
    variant === "other",
  );

  // API mutation to add a friend
  const { mutate: addFriend } = useApiMutation(createFriendship);
  const handleAddFriend = async (): Promise<void> => {
    const result = await addFriend({
      requesterId: userId,
      accepterId: selectedId,
    });

    if (result.success) {
      refetchFriends();
      onClose();
    }
  };

  let buttonText: string = translate("add_friend");
  let disableButton: boolean = false;
  if (variant === "other") {
    // .some() checks if at least one element in the array returns true.
    const isBlocked = blocked?.some((u) => u.id === selectedId);
    const isFriend = friends?.some((u) => u.id === selectedId);
    const isRequestSent = requests?.some((u) => u.id === userId);

    if (friendsLoading || requestsLoading || blockedLoading)
      buttonText = translate("loading");
    // isBlocked must be set before friends because friends can be blocked
    else if (isBlocked) buttonText = translate("blocked");
    else if (isFriend) buttonText = translate("friend");
    else if (isRequestSent) buttonText = translate("request_sent");
    disableButton =
      blockedLoading ||
      friendsLoading ||
      requestsLoading ||
      !!isBlocked ||
      !!isFriend ||
      !!isRequestSent;
  }

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>{header}</Header>
      <ProfileContents selectedId={selectedId} />
      {variant === "other" && (
        <Button
          variant="yellow"
          onClick={handleAddFriend}
          disabled={disableButton}
        >
          {buttonText}
        </Button>
      )}
    </PopupCard>
  );
};

export default ProfilePopup;
