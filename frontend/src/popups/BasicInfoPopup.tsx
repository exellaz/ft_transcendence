import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useApiQuery, useApiMutation } from "../hooks/useApi";
import {
  getUserById,
  updateUserById,
  uploadUserAvatar,
} from "../lib/usersApiClient";
import type { User } from "../types/usersApi";
import { formatDate } from "../utils/date";

import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from "../components/ApiState";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Header from "../components/Header";
import Input from "../components/Input";
import PopupCard from "../components/PopupCard";
import Status from "../components/Status";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userId: number;
}

const BasicInfoPopup: React.FC<PopupProps> = ({ open, onClose, userId }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`BasicInfoPopup.${key}`);

  // API query for user data
  const {
    data: user,
    loading,
    error,
    refetch,
  } = useApiQuery<User>(
    () => getUserById({ id: userId }),
    [open],
    userId !== 0,
  );

  // API mutation to update user data
  const { mutate } = useApiMutation(updateUserById);

  // Avatar upload file input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  // when user data is fetched, populate the form fields
  useEffect(() => {
    if (user) setUsername(user.username);
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // frontend file validation
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png"];
    const ext = file.name.split(".").pop()?.toLowerCase();

    // file can only be .jpg/.jpeg/.png
    if (
      !ALLOWED_TYPES.includes(file.type) ||
      // || "" ensures you’re always passing a string into .includes()
      // because ext could be undefined
      !["jpg", "jpeg", "png"].includes(ext || "")
    ) {
      alert(translate("invalid_file_type_error"));
      return;
    }
    // file must be under 2MB
    if (file.size > MAX_FILE_SIZE) {
      alert(translate("file_too_large_error"));
      return;
    }

    try {
      const response = await uploadUserAvatar({ id: userId, avatarFile: file });
      if (!response.success || !response.data) {
        console.warn("Avatar upload failed:", response);
        return;
      }
      refetch();
      // notify ProfileDropdown about updated user data
      window.dispatchEvent(new CustomEvent("userUpdated"));
    } catch (err) {
      console.error("Avatar upload error:", err);
    } finally {
      // reset file input so same file can be reselected
      // browsers only fire onChange when the input’s value changes,
      // so if the user selects the exact same file twice in a row and the input is not cleared,
      // nothing happens on the second attempt
      e.target.value = "";
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    // clear error when user types
    if (saveError) setSaveError(null);
  };

  const handleSave = async (): Promise<void> => {
    // return if no changes to username
    if (!user || username.trim() === user.username) return;

    // clear previous errors
    setSaveError(null);

    try {
      const response = await mutate({
        id: user.id,
        username: username.trim(),
      });

      const errorMessages: Record<string, string> = {
        USERNAME_INVALID: translate("username_invalid"),
        USERNAME_TOO_SHORT: translate("username_too_short"),
        USERNAME_TOO_LONG: translate("username_too_long"),
        USERNAME_CONFLICT: translate("username_conflict"),
      };

      if (!response.success || !response.data) {
        setSaveError(
          response.errorCode && typeof response.errorCode === "string"
            ? errorMessages[response.errorCode] || translate("save_failed")
            : translate("save_failed"),
        );
        return;
      }
      refetch();
      // notify ProfileDropdown about updated user data
      window.dispatchEvent(new CustomEvent("userUpdated"));
    } catch {
      setSaveError(translate("save_failed"));
    }
  };

  // Cancel will reset the username to its original value
  // user.username is the username fetched from the API
  function handleCancel() {
    if (user) setUsername(user.username);
  }

  let children: React.ReactNode;

  if (loading) children = <LoadingState />;
  else if (error) children = <ErrorState onRetry={refetch} />;
  else if (!user) children = <NotFoundState />;
  else
    children = (
      <>
        <div className="w-full text-center text-white">
          <p>ID: {user.id}</p>
          <p>
            {translate("joined")}: {formatDate(user.joinedAt)}
          </p>
        </div>
        <div className="relative flex-row-center">
          <Avatar src={user.avatarUrl} size={120} />
          <img
            src="/assets/edit.png"
            alt="Change Avatar"
            title={translate("change_avatar")}
            className="absolute bottom-0 right-0 translate-x-4 translate-y-2 w-8 h-8 icon-btn"
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleAvatarChange}
          />
          ;
        </div>
        <Input
          value={username}
          onChange={handleUsernameChange}
          placeholder={translate("username")}
          icon={<img src="/assets/user.png" alt="user.png" className="w-10" />}
          maxLength={30}
        />
        {saveError && <Status text={saveError} color="red" />}
        {/* Email is read-only */}
        <Input
          value={user.email}
          placeholder={translate("email")}
          type="email"
          disabled={true}
          icon={
            <img src="/assets/email.png" alt="email.png" className="w-10" />
          }
        />
        <div className="w-full flex-row-center gap-6">
          <Button onClick={handleSave}>{translate("save_changes")}</Button>
          <Button variant="brown" onClick={handleCancel}>
            {translate("cancel")}
          </Button>
        </div>
      </>
    );

  return (
    <PopupCard
      open={open}
      onClose={() => {
        setSaveError(null);
        onClose();
      }}
    >
      <Header>{translate("header")}</Header>
      {children}
    </PopupCard>
  );
};

export default BasicInfoPopup;
