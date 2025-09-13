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
  userUid: string;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  setShowProfile,
  setShowBasicInfo,
  setShowFriends,
  setShowTournamentStats,
  userUid,
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

  // TODO: Fetch real data based on userUid
  // useEffect(() => {
  //   // Fetch user's basic info
  //   fetch(`/api/profile-dropdown?userUid=${userUid}`)
  //     .then((res) => res.json())
  //     .then(setUser);
  // }, [userUid]);

  // TODO: Delete when API is integrated
  function getProfileDropdownByUid(
    userUid: string,
    data: ProfileDropdownInfo[]
  ): ProfileDropdownInfo | undefined {
    return data.find((user) => user.uid === userUid);
  }
  useEffect(() => {
    setUser(getProfileDropdownByUid(userUid, mockProfileDropdownInfo) || null);
  }, [userUid]);

  if (!user) return <div>{translate("loading")}</div>;

  return (
    <div className="fixed top-10 right-10">
      <Button
        variant="profile"
        onClick={() => setOpen(!open)}
        className="flex items-center px-4 shadow"
      >
        <div>
          <Avatar src={user.avatarUrl} size={80} className="mr-4" />
        </div>
        {user.username.length > 8
          ? user.username.slice(0, 8) + "..."
          : user.username}
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
