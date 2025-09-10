import React, { useState } from "react";
import { useUser } from "../context/UserContext";

import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Header from "../components/Header";
import Input from "../components/Input";
import PopupCard from "../components/PopupCard";
import Status from "../components/Status";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const BasicInfoPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const { user } = useUser();
  const [showAvatarUpload, setShowAvatarUpload] = React.useState(false);
  const [avatarUploadStatus, setavatarUploadStatus] = useState<
    null | "success" | "error"
  >(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <PopupCard open={open} onClose={onClose}>
      {!showAvatarUpload ? (
        <>
          <Header>Basic Info</Header>
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-white">ID: {user?.id}</p>
              <p className="text-white">Joined: {user?.createdAt}</p>
            </div>
            <div className="flex items-center gap-6">
              <Avatar src={user?.avatarUrl} size={100} />
              <div>
                <Button
                  variant="yellow"
                  onClick={() => setShowAvatarUpload(true)}
                >
                  Change Avatar
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center w-full">
              <Input
                value={user?.username}
                placeholder="Username"
                className="mb-5"
                icon={
                  <img src="/assets/user.png" alt="user.png" className="w-10" />
                }
              />
              <Status text="Username is available" color="green" />
              <Input
                value={user?.email}
                placeholder="Email"
                type="email"
                className="mb-5"
                icon={
                  <img
                    src="/assets/email.png"
                    alt="email.png"
                    className="w-10"
                  />
                }
              />
            </div>
            <div className="flex gap-6">
              <Button variant="yellow">Save Changes</Button>
              <Button variant="brown">Cancel</Button>
            </div>
          </div>
        </>
      ) : (
        // Avatar Upload
        <div className="w-full h-full flex flex-col items-center justify-center gap-6">
          <Avatar src={user?.avatarUrl} size={100} />
          <div className="w-full h-[300px] border-gray-300 border-3 rounded-3xl p-10 flex flex-col items-center justify-center gap-6">
            <h2 className="text-white text-xl font-bold">
              Upload a new avatar
            </h2>
            {!selectedFile && (
              // identical to yellow Button styling
              <label
                className="w-32 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black hover:text-white py-2 
                font-bold text-center cursor-pointer transition-colors"
              >
                Upload Avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      setavatarUploadStatus(null); // Reset status
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
                    setavatarUploadStatus("success"); // or "error" if upload fails
                  }}
                >
                  Confirm Upload
                </Button>
              </div>
            )}
            {avatarUploadStatus === "success" && (
              <p className="text-green-400">Avatar has been updated.</p>
            )}
            {avatarUploadStatus === "error" && (
              <p className="text-red-400">Avatar could not be updated.</p>
            )}
          </div>
          <Button
            variant="yellow"
            onClick={() => {
              setShowAvatarUpload(false);
              setavatarUploadStatus(null);
              setSelectedFile(null);
            }}
          >
            Back
          </Button>
        </div>
      )}
    </PopupCard>
  );
};

export default BasicInfoPopup;
