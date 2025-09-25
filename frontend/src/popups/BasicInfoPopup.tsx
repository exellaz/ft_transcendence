import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApiQuery, useApiMutation } from "../hooks/useApi";
import { getUserById, updateUserById } from "../lib/apiClient";
import { formatDate } from "../utils/date";
// TODO: Remove mock data import when integrating real API
// import type { BasicInfo } from "../types/apiInterfaces";
// import { mockBasicInfo } from "../data/mockUsers";

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
  userId: string;
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
  } = useApiQuery(() => getUserById({ id: Number(userId) }), [open]);

  // API mutation to update user data
  const { mutate: updateUser } = useApiMutation(updateUserById);

  // Avatar upload states
  const [showAvatarUpload, setShowAvatarUpload] = React.useState(false);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<
    null | "success" | "error"
  >(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  // TODO: Delete when API is integrated
  // const [user, setUser] = useState<BasicInfo | null>(null);
  // function getBasicInfoByUid(
  //   userId: string,
  //   data: BasicInfo[]
  // ): BasicInfo | undefined {
  //   return data.find((user) => user.uid === userId);
  // }
  // useEffect(() => {
  //   setUser(getBasicInfoByUid(userId, mockBasicInfo) || null);
  // }, [userId]);

  function handleClose() {
    onClose();
    setShowAvatarUpload(false);
    setAvatarUploadStatus(null);
    setSelectedFile(null);
  }

  let children: React.ReactNode;

  if (loading) children = <LoadingState />;
  else if (error) children = <ErrorState error={error} onRetry={refetch} />;
  else if (!user) children = <NotFoundState />;
  else if (!showAvatarUpload) {
    // Main Basic Info View
    children = (
      <>
        <Header>{translate("header")}</Header>
        <div className="w-full text-center text-white">
          <p>ID: {user.id}</p>
          <p>
            {translate("joined")}: {formatDate(user.joinedAt)}
          </p>
        </div>
        <div className="w-full flex-row-center gap-6">
          <Avatar src={user.avatarUrl} size={100} />
          <div>
            <Button variant="yellow" onClick={() => setShowAvatarUpload(true)}>
              {translate("change_avatar")}
            </Button>
          </div>
        </div>
        <div className="w-full flex-col-center gap-2">
          <Input
            value={user.username}
            placeholder={translate("username")}
            icon={
              <img src="/assets/user.png" alt="user.png" className="w-10" />
            }
          />
          <Status text={translate("username_available")} color="green" />
          <Input
            value={user.email}
            placeholder={translate("email")}
            type="email"
            icon={
              <img src="/assets/email.png" alt="email.png" className="w-10" />
            }
          />
        </div>
        <div className="w-full flex-row-center gap-6">
          <Button>{translate("save_changes")}</Button>
          <Button variant="brown">{translate("cancel")}</Button>
        </div>
      </>
    );
  } else {
    // Avatar Upload View
    children = (
      <>
        <div>
          <Avatar src={user.avatarUrl} size={100} />
        </div>
        <div className="w-full h-[300px] border-gray-300 border-3 rounded-3xl flex-col-center gap-6">
          <p className="text-white text-xl font-bold">
            {translate("upload_avatar")}
          </p>
          {!selectedFile && (
            // identical to yellow Button styling
            <label
              className="w-32 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black hover:text-white py-2 
                font-bold text-center cursor-pointer transition-colors"
            >
              {translate("upload_avatar_button")}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                    setAvatarUploadStatus(null); // Reset status
                  }
                }}
                className="hidden"
              />
            </label>
          )}

          {selectedFile && (
            <div className="flex flex-col-center gap-6">
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Avatar Preview"
                className="w-20 h-20 object-cover rounded-full bg-white"
              />
              <Button
                variant="yellow"
                onClick={() => {
                  // Handle upload logic here (e.g., send to server)
                  setAvatarUploadStatus("success"); // or "error" if upload fails
                }}
              >
                {translate("confirm_upload")}
              </Button>
            </div>
          )}
          {avatarUploadStatus === "success" && (
            <p className="text-green-400">{translate("avatar_updated")}</p>
          )}
          {avatarUploadStatus === "error" && (
            <p className="text-red-400">{translate("avatar_update_error")}</p>
          )}
        </div>
        <Button
          variant="yellow"
          onClick={() => {
            setShowAvatarUpload(false);
            setAvatarUploadStatus(null);
            setSelectedFile(null);
          }}
        >
          {translate("back")}
        </Button>
      </>
    );
  }

  return (
    <PopupCard open={open} onClose={handleClose}>
      {children}
    </PopupCard>
  );
};

export default BasicInfoPopup;
