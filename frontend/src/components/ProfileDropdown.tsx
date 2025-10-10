import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApiQuery } from "../hooks/useApi";
import { getUserById } from "../lib/usersApiClient";
import { useNavigate } from "react-router-dom";
// TODO: Remove mock data import when integrating real API
// import type { ProfileDropdownInfo } from "../types/apiInterfaces";
// import { mockProfileDropdownInfo } from "../data/mockUsers";

import Avatar from "./Avatar";
import Button from "./Button";
import type { User } from "../types/usersApi";

interface ProfileDropdownProps {
  setShowProfile: (open: boolean) => void;
  setShowBasicInfo: (open: boolean) => void;
  setShowFriends: (open: boolean) => void;
  setShowTournamentStats: (open: boolean) => void;
  userId: number;
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

  // API query for user data
  const { data: user, refetch } = useApiQuery<User>(
    () => getUserById({ id: Number(userId) }),
    [userId],
  );
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Listen for user info updates
  useEffect(() => {
    const handleUserUpdate = () => {
      refetch(); // Refresh profile data
    };

    // Listen for custom events (you'll dispatch this from BasicInfoPopup)
    window.addEventListener("userUpdated", handleUserUpdate);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate);
    };
  }, [refetch]);

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

  // TODO: Delete when API is integrated
  // const [user, setUser] = useState<ProfileDropdownInfo | null>(null);
  // function getProfileDropdownById(
  //   userId: number,
  //   data: ProfileDropdownInfo[]
  // ): ProfileDropdownInfo | undefined {
  //   return data.find((user) => user.id === userId);
  // }
  // useEffect(() => {
  //   setUser(getProfileDropdownById(userId, mockProfileDropdownInfo) || null);
  // }, [userId]);

  return (
    <div className="fixed top-10 right-10 z-20">
      <Button
        variant="profile"
        onClick={() => setOpen(!open)}
        className="flex-row-center gap-4 shadow"
      >
        <div>
          <Avatar src={user?.avatarUrl} size={80} />
        </div>
        {user
          ? user.username.length > 8
            ? user.username.slice(0, 8) + "..."
            : user.username
          : t("common.loading")}
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
