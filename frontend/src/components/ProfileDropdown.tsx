import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "./Button";
import ProfileIcon from "./ProfileIcon";

import avatar from "../assets/yellow-ghost.png";

const ProfileDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const menuItems = [
    {
      label: "BASIC INFO",
      onClick: () => {
        /* handle basic info */
      },
    },
    {
      label: "TOURNAMENT STATS",
      onClick: () => {
        /* handle stats */
      },
    },
    {
      label: "FRIENDS",
      onClick: () => {
        /* handle friends */
      },
    },
    {
      label: "BLOCK LIST",
      onClick: () => {
        /* handle block list */
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
        <ProfileIcon src={avatar} size={80} />
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
