import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

import Avatar from "./Avatar";
import Button from "./Button";

interface ProfileDropdownProps {
  setShowProfile: (open: boolean) => void;
  setShowBasicInfo: (open: boolean) => void;
  setShowFriends: (open: boolean) => void;
  setShowTournamentStats: (open: boolean) => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  setShowProfile,
  setShowBasicInfo,
  setShowFriends,
  setShowTournamentStats,
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();
  const menuItems = [
    {
      label: "MY PROFILE",
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
        <Avatar src={user?.avatarUrl} size={80} />
        <span className="w-24 mx-2 font-bold text-lg hover:text-white text-card-blue overflow-hidden">
          {user?.username || "Username"}
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
