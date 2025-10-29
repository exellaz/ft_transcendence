import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApiQuery, useApiMutation } from "../hooks/useApi";
import { getUserById, updateUserById } from "../lib/usersApiClient";
import type { User } from "../types/usersApi";

import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from "../components/ApiState";
import Button from "../components/Button";
import Header from "../components/Header";
import OtpInputField from "../components/OtpInputField";
import PopupCard from "../components/PopupCard";
import Status from "../components/Status";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userId: number;
}

const TwoFAPopup: React.FC<PopupProps> = ({ open, onClose, userId }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`TwoFAPopup.${key}`);

  // TODO: modify API query and mutation
  // API query for user data
  // const { data, loading, error, refetch } = useApiQuery<User>(
  //   () => getUserById({ id: userId }),
  //   [open],
  //   userId !== 0
  // );

  // API mutation to update user data
  // const { mutate } = useApiMutation(updateUserById);

  // TODO: remove hardcoded states when API is ready
  const [verifyError, setVerifyError] = useState<string | null>(
    translate("invalid_code_error"),
  );
  const [step, setStep] = useState<"initial" | "setup" | "enabled">("setup");
  const [qrUrl, setQrUrl] = useState("/assets/qr-placeholder.png");
  const [secret, setSecret] = useState("ABCDEFGHIJKLM");
  const [code, setCode] = useState("");

  let children: React.ReactNode;
  const divStyle = "w-full h-full text-white text-center";

  // TODO: uncomment when API is ready, and change "initial" block to else if
  // if (loading) children = <LoadingState />;
  // else if (error) children = <ErrorState error={error} onRetry={refetch} />;
  // else if (!data) children = <NotFoundState />;

  // Initial view prompting user to enable 2FA
  if (step === "initial") {
    children = (
      <div className={`${divStyle} flex-col-center gap-10`}>
        <Subheader>{translate("2fa_not_enabled_message")}</Subheader>
        <img src="/assets/secure.png" alt="secure.png" className="w-40 h-40" />
        <Button onClick={() => {}}>{translate("enable_2fa")}</Button>
      </div>
    );
  }

  // Setup view with QR, secret and OTP input field
  else if (step === "setup") {
    children = (
      <div className={`${divStyle} flex-col-around mt-6`}>
        {qrUrl && (
          <img src={qrUrl} alt="QR code" className="w-40 h-40 self-center" />
        )}
        <p className="text-sm text-gray-500">Secret: {secret}</p>
        <p className="text-xl">{translate("authenticator_instructions")}</p>
        <OtpInputField value={code} onChange={setCode} />
        {verifyError && <Status color="red" text={verifyError} />}
        <Button onClick={() => {}}>{translate("verify_code")}</Button>
      </div>
    );
  }

  // Enabled view after successful setup, with option to disable 2FA
  else if (step === "enabled") {
    children = (
      <div className={`${divStyle} flex-col-center gap-10`}>
        <Subheader>{translate("2fa_enabled_message")}</Subheader>
        <img src="/assets/secure.png" alt="secure.png" className="w-40 h-40" />
        <Button onClick={() => {}}>{translate("disable_2fa")}</Button>
      </div>
    );
  }

  return (
    <PopupCard
      open={open}
      onClose={() => {
        setVerifyError(null);
        onClose();
      }}
    >
      <Header>{translate("header")}</Header>
      {children}
    </PopupCard>
  );
};

export default TwoFAPopup;
