import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "./Button";
import Avatar from "./Avatar";

interface ProfileDropdownProps {
  setShowProfile: (open: boolean) => void;
  setShowBasicInfo: (open: boolean) => void;
  setShowFriends: (open: boolean) => void;
  setShowTournamentStats: (open: boolean) => void;
  setShowBlockList: (open: boolean) => void;
  src?: string;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  setShowProfile,
  setShowBasicInfo,
  setShowFriends,
  setShowTournamentStats,
  setShowBlockList,
  src,
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const menuItems = [
    {
      label: "PROFILE",
      onClick: () => {
        setOpen(false);
        setShowProfile(true);
      },
    },
    {
      label: "BASIC INFO",
      onClick: () => {
        setOpen(false);
        setShowBasicInfo(true);
      },
    },
    {
      label: "TOURNAMENT STATS",
      onClick: () => {
        setOpen(false);
        setShowTournamentStats(true);
      },
    },
    {
      label: "FRIENDS",
      onClick: () => {
        setOpen(false);
        setShowFriends(true);
      },
    },
    {
      label: "BLOCK LIST",
      onClick: () => {
        setOpen(false);
        setShowBlockList(true);
      },
    },
    {
      label: "LOG OUT",
      onClick: () => {
        navigate("/login");
      },
    },
  ];

  return (
    <div className="fixed top-10 right-10">
      <Button
        onClick={() => setOpen(!open)}
        className="flex items-center rounded-full px-4 shadow"
      >
        <Avatar src={src} size={80} />
        <span className="w-24 mx-2 font-bold text-lg text-card-blue overflow-hidden">
          Username
        </span>
      </Button>

      {open && (
        <div className="flex flex-col mt-2 mx-4">
          {menuItems.map((item) => (
            <Button variant="dropdown" onClick={item.onClick}>
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
