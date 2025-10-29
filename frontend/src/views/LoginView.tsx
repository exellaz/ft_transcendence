import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";
import { useLanguage } from "../context/LanguageProvider";
import { login, getUserSettingsById } from "../lib/usersApiClient";
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
  const { t } = useTranslation();
  const translate = (key: string) => t(`LoginView.${key}`);
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { setLanguage } = useLanguage();

  // TODO: Remove hardcoded error
  const [verifyError, setVerifyError] = useState<string | null>(
    translate("invalid_code_error"),
  );
  const [step, setStep] = useState<"login" | "2FA">("login");
  const [code, setCode] = useState("");

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useClearGameMode();

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      if (error) setError(null);
    };

  const validateForm = (): string | null => {
    if (!formData.identifier.trim())
      return translate("username_or_email_required");
    if (!formData.password) return translate("password_required");
    return null;
  };

  const handleLogin = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const loginResponse = await login({
        identifier: formData.identifier,
        password: formData.password,
      });

      if (!loginResponse.success || !loginResponse.data) {
        // Check for errorCode and translate if present
        if (loginResponse.errorCode === "INVALID_CREDENTIALS") {
          setError(translate("invalid_credentials"));
        } else {
          setError(translate("login_failed"));
        }
        return;
      }

      // Success: Store token and user data, then redirect
      localStorage.setItem("authToken", loginResponse.data.token);
      setUser(loginResponse.data.user);

      // Raw API query for user's preferred language
      const settingsResponse = await getUserSettingsById({
        id: loginResponse.data.user.id,
      });
      if (settingsResponse.success && settingsResponse.data?.language) {
        setLanguage(settingsResponse.data.language);
      }

      navigate("/main-menu");
    } catch (err) {
      setError(translate("login_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleLogin();
    }
  };

  const handleGoogleSuccess = () => {
    setError(null);
  };

  const handleGoogleError = (errorMessage: string) => {
    setError(errorMessage);
  };

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
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
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
        <OtpInputField value={code} onChange={setCode} />
        {verifyError && <Status color="red" text={verifyError} />}
        <Button onClick={() => {}}>{translate("verify_code")}</Button>
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
