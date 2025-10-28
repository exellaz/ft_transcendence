import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApiQuery } from "../hooks/useApi";
import { getUserById } from "../lib/usersApiClient";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";

import Avatar from "./Avatar";
import Button from "./Button";
import type { User } from "../types/usersApi";

interface ProfileDropdownProps {
  setShowProfile: (open: boolean) => void;
  setShowBasicInfo: (open: boolean) => void;
  setShowTwoFA: (open: boolean) => void;
  setShowFriends: (open: boolean) => void;
  setShowTournamentStats: (open: boolean) => void;
  setShowHowToPlay: (open: boolean) => void;
  userId: number;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  setShowProfile,
  setShowBasicInfo,
  setShowTwoFA,
  setShowFriends,
  setShowTournamentStats,
  setShowHowToPlay,
  userId,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ProfileDropdown.${key}`);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useUser();

  // API query for user data
  // unset userId will be temporarily assigned 0,
  // so only call the API if userId !== 0
  const { data: user, refetch } = useApiQuery<User>(
    () => getUserById({ id: userId }),
    [userId],
    userId !== 0,
  );

  // listen for user info updates
  useEffect(() => {
    const handleUserUpdate = () => {
      refetch(); // Refresh profile data
    };

    // event will dispatch from BasicInfoPopup
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
      label: translate("2fa_settings"),
      onClick: () => {
        setOpen(false);
        setShowTwoFA(true);
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
      label: translate("how_to_play"),
      onClick: () => {
        setOpen(false);
        setShowHowToPlay(true);
      },
    },
    {
      label: translate("log_out"),
      onClick: () => {
        logout();
        setOpen(false);
        navigate("/login");
      },
    },
  ];

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
          : translate("loading")}
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
