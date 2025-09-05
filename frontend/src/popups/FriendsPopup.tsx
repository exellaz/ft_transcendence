import React, { useState } from "react";
import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import RadioButtonGroup from "../components/RadioButtonGroup";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const FriendsPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const [language, setLanguage] = useState("English");
  const [camera, setCamera] = useState("Static");

  return (
    <PopupCard size="large" open={open} onClose={onClose}>
      <Header>Basic Info</Header>
      <Subheader>Language</Subheader>
      <RadioButtonGroup
        options={["English", "中文", "Bahasa Melayu"]}
        value={language}
        onChange={setLanguage}
      />
      <Subheader>In-Game Camera Tracking</Subheader>
      <RadioButtonGroup
        options={["Static", "Dynamic"]}
        value={camera}
        onChange={setCamera}
      />
    </PopupCard>
  );
};

export default FriendsPopup;
