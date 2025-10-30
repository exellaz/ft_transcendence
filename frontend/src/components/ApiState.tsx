import React from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button";

// ========================= LOADING COMPONENT =========================
export const LoadingState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full flex-col-center text-white text-center">
      {t("ApiState.loading")}
    </div>
  );
};

// ========================= ERROR COMPONENT =========================
interface ErrorStateProps {
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full flex-col-center gap-6 text-red-400 text-center">
      {t("ApiState.something_went_wrong")}
      <Button onClick={onRetry}>{t("ApiState.try_again")}</Button>
    </div>
  );
};

// ========================= NOT FOUND COMPONENT =========================
export const NotFoundState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full flex-col-center text-white text-center">
      {t("ApiState.not_found")}
    </div>
  );
};
