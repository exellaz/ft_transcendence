import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { ProfileDropdownInfo } from "../types/apiInterfaces";
// TODO: Remove mock data import when integrating real API
import { mockProfileDropdownInfo } from "../data/mockUsers";

import Avatar from "./Avatar";
import Button from "./Button";

interface ProfileDropdownProps {
  setShowProfile: (open: boolean) => void;
  setShowBasicInfo: (open: boolean) => void;
  setShowFriends: (open: boolean) => void;
  setShowTournamentStats: (open: boolean) => void;
  userId: string;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  setShowProfile,
  setShowBasicInfo,
  setShowFriends,
  setShowTournamentStats,
  userId,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ProfileDropdown.${key}`);
  const [user, setUser] = useState<ProfileDropdownInfo | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const menuItems = [
    {
      label: translate("my_profile"),
      onClick: () => {
        setOpen(false);
        setShowProfile(true);
      },
    },
    {
      label: translate("basic_info"),
      onClick: () => {
        setOpen(false);
        setShowBasicInfo(true);
      },
    },
    {
      label: translate("tournament_stats"),
      onClick: () => {
        setOpen(false);
        setShowTournamentStats(true);
      },
    },
    {
      label: translate("friends"),
      onClick: () => {
        setOpen(false);
        setShowFriends(true);
      },
    },
    {
      label: translate("log_out"),
      onClick: () => {
        navigate("/login");
      },
    },
  ];

  // TODO: Fetch real data based on userId
  // useEffect(() => {
  //   // Fetch user's basic info
  //   fetch(`/api/profile-dropdown?userId=${userId}`)
  //     .then((res) => res.json())
  //     .then(setUser);
  // }, [userId]);

  // TODO: Delete when API is integrated
  function getProfileDropdownByUid(
    userId: string,
    data: ProfileDropdownInfo[]
  ): ProfileDropdownInfo | undefined {
    return data.find((user) => user.uid === userId);
  }
  useEffect(() => {
    setUser(getProfileDropdownByUid(userId, mockProfileDropdownInfo) || null);
  }, [userId]);

  if (!user) return <div>{translate("loading")}</div>;

  return (
    <div className="fixed top-10 right-10">
      <Button
        variant="profile"
        onClick={() => setOpen(!open)}
        className="flex-row-center gap-4 shadow"
      >
        <div>
          <Avatar src={user.avatarUrl} size={80}/>
        </div>
        {user.username.length > 8
          ? user.username.slice(0, 8) + "..."
          : user.username}
      </Button>

      {open && (
        <div className="flex-col-center mt-2">
          {menuItems.map((item) => (
            <Button key={item.label} variant="dropdown" onClick={item.onClick}>
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
