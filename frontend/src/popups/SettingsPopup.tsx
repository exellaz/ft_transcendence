import React, { useState } from "react";
import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import RadioButtonGroup from "../components/RadioButtonGroup";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const SettingsPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const [language, setLanguage] = useState("English");
  const [camera, setCamera] = useState("Static");

  return (
    <PopupCard size="large" open={open} onClose={onClose}>
      <Header>Settings</Header>
      <Subheader>Language</Subheader>
      <RadioButtonGroup
        options={[
          { value: "en", label: "English" },
          { value: "zhs", label: "简体中文" },
          { value: "zht", label: "繁體中文" },
        ]}
        selectedValue={language}
        onChange={setLanguage}
      />
      <Subheader>In-Game Camera Tracking</Subheader>
      <RadioButtonGroup
        options={[
          { value: "Static", label: "Static" },
          { value: "Dynamic", label: "Dynamic" },
        ]}
        selectedValue={camera}
        onChange={setCamera}
      />
    </PopupCard>
  );
};

export default SettingsPopup;
