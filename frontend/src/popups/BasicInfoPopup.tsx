import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BasicInfo } from "../types/apiInterfaces";
// TODO: Remove mock data import when integrating real API
import { mockBasicInfo } from "../data/mockUsers";

import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Header from "../components/Header";
import Input from "../components/Input";
import PopupCard from "../components/PopupCard";
import Status from "../components/Status";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userUid: string;
}

const BasicInfoPopup: React.FC<PopupProps> = ({ open, onClose, userUid }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`BasicInfoPopup.${key}`);
  const [user, setUser] = useState<BasicInfo | null>(null);
  const [showAvatarUpload, setShowAvatarUpload] = React.useState(false);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<
    null | "success" | "error"
  >(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // TODO: Fetch real data based on userUid
  // useEffect(() => {
  //   // Fetch user's basic info
  //   fetch(`/api/basic-info?userUid=${userUid}`)
  //     .then((res) => res.json())
  //     .then(setUser);
  // }, [userUid]);

  // TODO: Delete when API is integrated
  function getBasicInfoByUid(
    userUid: string,
    data: BasicInfo[]
  ): BasicInfo | undefined {
    return data.find((user) => user.uid === userUid);
  }
  useEffect(() => {
    setUser(getBasicInfoByUid(userUid, mockBasicInfo) || null);
  }, [userUid]);

  if (!user) return <div>{translate("loading")}</div>;

  function handleClose() {
    onClose();
    setShowAvatarUpload(false);
    setAvatarUploadStatus(null);
    setSelectedFile(null);
  }

  return (
    <PopupCard open={open} onClose={handleClose}>
      {!showAvatarUpload ? (
        <>
          <Header>{translate("header")}</Header>
          <div className="w-full text-center text-white">
            <p>ID: {user.uid}</p>
            <p>
              {translate("joined")}: {user.joinDate}
            </p>
          </div>
          <div className="w-full flex-row-center gap-6">
            <Avatar src={user?.avatarUrl} size={100} />
            <div>
              <Button
                variant="yellow"
                onClick={() => setShowAvatarUpload(true)}
              >
                {translate("change_avatar")}
              </Button>
            </div>
          </div>
          <div className="w-full flex-col-center gap-2">
            <Input
              value={user?.username}
              placeholder={translate("username")}
              icon={
                <img src="/assets/user.png" alt="user.png" className="w-10" />
              }
            />
            <Status text={translate("username_available")} color="green" />
            <Input
              value={user?.email}
              placeholder={translate("email")}
              type="email"
              icon={
                <img src="/assets/email.png" alt="email.png" className="w-10" />
              }
            />
          </div>
          <div className="w-full flex-row-center gap-6">
            <Button variant="yellow">{translate("save_changes")}</Button>
            <Button variant="brown">{translate("cancel")}</Button>
          </div>
        </>
      ) : (
        // Avatar Upload
        <div className="w-full h-full flex-col-center gap-6">
          <Avatar src={user?.avatarUrl} size={100} />
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
              <div className="flex flex-col items-center gap-6">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Avatar Preview"
                  className="w-20 h-20 rounded-full bg-white"
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
        </div>
      )}
    </PopupCard>
  );
};

export default BasicInfoPopup;
