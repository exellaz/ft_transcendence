import React from "react";
import { useTranslation } from "react-i18next";

interface CustomToastProps {
  username: string;
  message: string;
}

const CustomToast: React.FC<CustomToastProps> = ({ username, message }) => {
  const { t } = useTranslation();

  return (
    <div className="relative w-100 h-20 rounded-2xl bg-input-gray/80 border border-yellow-400/60 border-4 flex-col-center">
      <p className="font-semibold text-green-300">
        {t("CustomToast.message_from", {
          username: username,
        })}
      </p>
      <p className="text-sm text-white">
        {message.length > 45 ? message.slice(0, 45).trimEnd() + "…" : message}
      </p>
    </div>
  );
};

export default CustomToast;
