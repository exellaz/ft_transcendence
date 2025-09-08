import React, { useState } from "react";
import PopupCard from "../components/PopupCard";
import SocialHub from "../components/SocialHub";
import type { SocialUser } from "../components/SocialHub";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const FriendsPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  // TODO: Replace with real data from context or props
  const friends = [
    {
      uid: "u1",
      username: "Aliceeeeeeeeeeeeeeeeeeee",
      avatarUrl: "/assets/red-ghost.png",
      lastMessage: "See you at the tournament!",
      timestamp: "2025-09-07 14:32",
      online: true,
    },
    {
      uid: "u2",
      username: "Bob",
      avatarUrl: "/assets/red-ghost.png",
      lastMessage: "GG!",
      timestamp: "2025-09-07 13:10",
      online: false,
    },
    {
      uid: "u3",
      username: "Alice",
      avatarUrl: "/assets/red-ghost.png",
      lastMessage: "See you at the tournament!",
      timestamp: "2025-09-07 14:32",
      online: true,
    },
    {
      uid: "u4",
      username: "Bob",
      avatarUrl: "/assets/red-ghost.png",
      lastMessage: "GG!",
      timestamp: "2025-09-07 13:10",
      online: false,
    },
    {
      uid: "u5",
      username: "Alice",
      avatarUrl: "/assets/red-ghost.png",
      lastMessage: "See you at the tournament!",
      timestamp: "2025-09-07 14:32",
      online: true,
    },
    {
      uid: "u6",
      username: "Bob",
      avatarUrl: "/assets/red-ghost.png",
      lastMessage: "GG!",
      timestamp: "2025-09-07 13:10",
      online: true,
    },
  ];

  const requests = [
    {
      uid: "u1",
      username: "Eveeeeeeeeeeeeee",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u2",
      username: "Frank",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u3",
      username: "Eve",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u4",
      username: "Frank",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u5",
      username: "Eve",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u6",
      username: "Frank",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u7",
      username: "Eve",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u8",
      username: "Frank",
      avatarUrl: "/assets/red-ghost.png",
    },
  ];

  const blocked = [
    {
      uid: "u1",
      username: "Charlieeeeeeeeeeeeeee",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u2",
      username: "Dana",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u3",
      username: "Charlie",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u4",
      username: "Dana",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u5",
      username: "Charlie",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u6",
      username: "Dana",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u7",
      username: "Charlie",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u8",
      username: "Dana",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u9",
      username: "Charlie",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u10",
      username: "Dana",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u11",
      username: "Charlie",
      avatarUrl: "/assets/red-ghost.png",
    },
    {
      uid: "u12",
      username: "Dana",
      avatarUrl: "/assets/red-ghost.png",
    },
  ];

  const [selectedUser, setSelectedUser] = useState<SocialUser | null>(null);

  return (
    <PopupCard
      open={open}
      onClose={onClose}
      size={selectedUser ? "social" : undefined}
    >
      <SocialHub
        friends={friends}
        requests={requests}
        blocked={blocked}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
      />
    </PopupCard>
  );
};

export default FriendsPopup;
