import React from "react";
import { useLanguage } from "../context/LanguageProvider";

import RadioButtonGroup from "./RadioButtonGroup";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "zhs", label: "简体中文" },
  { value: "zht", label: "繁體中文" }
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <RadioButtonGroup
      options={languageOptions}
      selectedValue={language}
      onChange={setLanguage} // This will be called with the selected value
    />
  );
};

export default LanguageSwitcher;
