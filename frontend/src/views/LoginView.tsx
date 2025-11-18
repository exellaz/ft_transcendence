import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginForm } from "../hooks/useLoginForm";
import { useClearGameMode } from "../hooks/useClearGameMode";

import Button from "../components/Button";
import Card from "../components/Card";
import Divider from "../components/Divider";
import Header from "../components/Header";
import Input from "../components/Input";
import Logo from "../components/Logo";
import OtpInputField from "../components/OtpInputField";
import PreLoginLayout from "../layout/PreLoginLayout";
import Status from "../components/Status";
import TextButton from "../components/TextButton";
import GoogleLoginButton from "../components/GoogleLoginButton";

const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const {
    formData,
    isLoading,
    error,
    verifyError,
    step,
    code,

    setCode,
    handleInputChange,
    handleLogin,
    handleTwoFactorVerify,
    handleGoogleSignIn,
    handleGoogleError,
    translate,
  } = useLoginForm();

  useClearGameMode();
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      if (step === "login") handleLogin();
      else if (step === "2FA") handleTwoFactorVerify();
    }
  };

  const memoizedHandleGoogleSignIn = useCallback(handleGoogleSignIn, []);
  const memoizedHandleGoogleError = useCallback(handleGoogleError, []);

  let children: React.ReactNode;
  if (step === "login") {
    children = (
      <>
        <Logo />
        <Input
          placeholder={translate("username_or_email")}
          value={formData.identifier}
          onChange={handleInputChange("identifier")}
          onKeyDown={handleKeyPress}
          icon={<img src="/assets/user.png" alt="user.png" className="w-10" />}
          maxLength={254}
        />
        <Input
          placeholder={translate("password")}
          type="password"
          value={formData.password}
          onChange={handleInputChange("password")}
          onKeyDown={handleKeyPress}
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
          maxLength={128}
        />
        {error && <Status text={error} color="red" />}
        <Button variant="longYellow" onClick={handleLogin}>
          {isLoading ? translate("loading") : translate("login")}
        </Button>
        <Divider />
        <GoogleLoginButton
          onSuccess={memoizedHandleGoogleSignIn}
          onError={memoizedHandleGoogleError}
        />
        <TextButton onClick={() => navigate("/signup")}>
          {translate("signup_prompt")}
        </TextButton>
      </>
    );
  } else if (step === "2FA") {
    children = (
      <>
        <Header>{translate("2fa")}</Header>
        <img src="/assets/secure.png" alt="secure.png" className="w-40 h-40" />
        <p className="text-white text-center text-xl">
          {translate("enter_code")}
        </p>
        <OtpInputField
          value={code}
          onChange={setCode}
          onKeyDown={handleKeyPress}
        />
        {verifyError && <Status color="red" text={verifyError} />}
        <Button onClick={handleTwoFactorVerify}>
          {translate("verify_code")}
        </Button>
      </>
    );
  }

  return (
    <PreLoginLayout>
      <Card>{children}</Card>
    </PreLoginLayout>
  );
};

export default LoginView;
