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
        variant="profile"
        onClick={() => setOpen(!open)}
        className="flex items-center px-4 shadow"
      >
        <div>
          <Avatar src={user?.avatarUrl} size={80} className="mr-4" />
        </div>
        {user?.username
          ? user.username.length > 8
            ? user.username.slice(0, 8) + "..."
            : user.username
          : "Username"}
      </Button>

      {open && (
        <div className="flex flex-col mt-2 ml-6">
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
