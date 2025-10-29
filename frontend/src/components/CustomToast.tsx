import React from "react";
import { useTranslation } from "react-i18next";

interface CustomToastProps {
  username?: string;
  message?: string;
}

const CustomToast: React.FC<CustomToastProps> = ({
  username = "test",
  message = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
}) => {
  const { t } = useTranslation();
  const truncated =
    message.length > 80 ? message.slice(0, 80).trimEnd() + "…" : message;

  return (
    <div className="w-80 rounded-2xl bg-white dark:bg-neutral-900 shadow-lg border border-gray-200 dark:border-neutral-800 p-4 flex flex-col gap-1">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
        {t("CustomToast.message_from", {
          username: username,
        })}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">{truncated}</p>
    </div>
  );
};

export default CustomToast;
