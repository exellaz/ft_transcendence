import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../components/ApiState";
import Button from "../components/Button";
import Header from "../components/Header";
import OtpInputField from "../components/OtpInputField";
import PopupCard from "../components/PopupCard";
import Status from "../components/Status";
import Subheader from "../components/Subheader";
import {
  getTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
} from "../lib/twoFactorApiClient";
import { useEffect } from "react";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userId: number;
}

const TwoFAPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`TwoFAPopup.${key}`);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [step, setStep] = useState<"initial" | "setup" | "enabled">("initial");
  const [qrUri, setQrUri] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");

  useEffect(() => {
    if (open) {
      checkTwoFactorStatus();
    }
  }, [open]);

  const checkTwoFactorStatus = async () => {
    setLoading(true);
    try {
      const response = await getTwoFactorStatus();
      if (response.success && response.data) {
        setStep(response.data.twoFactorEnabled ? "enabled" : "initial");
      }
    } catch {
      setVerifyError(translate("status_check_error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && step === "setup") {
      fetchQRCode();
    }
  }, [open, step]);

  const fetchQRCode = async () => {
    setLoading(true);
    try {
      const response = await getTwoFactorSetup();
      if (response.success && response.data) {
        setQrUri(response.data?.qrUri);
        setSecret(response.data?.secret);
      }
    } catch {
      setVerifyError(translate("qr_fetch_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setVerifyError(null);
    try {
      const response = await enableTwoFactor(code);
      if (response.success) {
        setStep("enabled");
      } else {
        setVerifyError(translate("invalid_code_error"));
      }
    } catch {
      setVerifyError(translate("verification_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const response = await disableTwoFactor();
      if (response.success) {
        setStep("initial");
        onClose();
      } else {
        setVerifyError(translate("disable_failed"));
      }
    } catch {
      setVerifyError(translate("disable_failed"));
    } finally {
      setLoading(false);
    }
  };

  let children: React.ReactNode;
  const divStyle = "w-full h-full text-white text-center";

  if (loading) children = <LoadingState />;

  if (step === "initial") {
    children = (
      <div className={`${divStyle} flex-col-center gap-10`}>
        <Subheader>{translate("2fa_not_enabled_message")}</Subheader>
        <img src="/assets/secure.png" alt="secure.png" className="w-40 h-40" />
        <Button onClick={() => setStep("setup")}>
          {translate("enable_2fa")}
        </Button>
      </div>
    );
  }

  // Setup view with QR, secret and OTP input field
  else if (step === "setup") {
    children = (
      <div className={`${divStyle} flex-col-around mt-6`}>
        {qrUri && (
          <img src={qrUri} alt="QR code" className="w-40 h-40 self-center" />
        )}
        <p className="text-sm text-gray-500">Secret: {secret}</p>
        <p className="text-xl">{translate("authenticator_instructions")}</p>
        <OtpInputField
          value={code}
          onChange={setCode}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.length === 6 && !loading) {
              e.preventDefault();
              handleVerifyCode();
            }
          }}
        />
        {verifyError && <Status color="red" text={verifyError} />}
        <Button onClick={handleVerifyCode}>{translate("verify_code")}</Button>
      </div>
    );
  }

  // Enabled view after successful setup, with option to disable 2FA
  else if (step === "enabled") {
    children = (
      <div className={`${divStyle} flex-col-center gap-10`}>
        <Subheader>{translate("2fa_enabled_message")}</Subheader>
        <img src="/assets/secure.png" alt="secure.png" className="w-40 h-40" />
        <Button onClick={handleDisable}>{translate("disable_2fa")}</Button>
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
