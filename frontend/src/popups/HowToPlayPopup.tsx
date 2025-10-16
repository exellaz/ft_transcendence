import React from "react";
import { useTranslation } from "react-i18next";

import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const HowToPlayPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`HowToPlayPopup.${key}`);

  const sections = ["objective", "controls", "tournament", "custom"];
  const paragraphClasses = "text-white text-md text-justify";

  return (
    <PopupCard open={open} onClose={onClose}>
      <div className="w-full h-full flex-col-between gap-6 overflow-y-auto scrollbar-hide">
        <Header>{translate("header")}</Header>
        {sections.map((section) => {
          const title = t(`HowToPlayPopup.${section}_title`);
          const textLines: string[] = t(`HowToPlayPopup.${section}_text`, {
            returnObjects: true,
          }) as string[];

          return (
            <div key={section} className="flex-col-center gap-3">
              <Subheader>{title}</Subheader>
              {textLines.map((line, i) => (
                <p key={i} className={paragraphClasses}>
                  {line}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </PopupCard>
  );
};

export default HowToPlayPopup;
