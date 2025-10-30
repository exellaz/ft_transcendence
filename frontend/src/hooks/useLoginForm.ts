import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";
import { useLanguage } from "../context/LanguageProvider";
import { login, getUserSettingsById } from "../lib/usersApiClient";
import { verifyTwoFactor } from "../lib/twoFactorApiClient";
import { googleLogin } from "../lib/googleApiClient";
import { type TwoFactorVerifyResponse } from "../lib/twoFactorApiClient";

export const useLoginForm = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`LoginView.${key}`);
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { setLanguage } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"login" | "2FA">("login");
  const [code, setCode] = useState("");
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<"standard" | "google">(
    "standard",
  );
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

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

      if (loginResponse.success) {
        await handleLoginSuccess(loginResponse.data);
      } else {
        if (loginResponse.errorCode === "TWO_FACTOR_REQUIRED") {
          setStep("2FA");
        } else if (loginResponse.errorCode === "INVALID_CREDENTIALS") {
          setError(translate("invalid_credentials"));
        } else {
          setError(loginResponse.error || translate("login_failed"));
        }
      }
    } catch {
      setError(translate("login_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleTwoFactorVerify = async () => {
    if (code.length !== 6 || !googleIdToken) return;

    setIsLoading(true);
    setVerifyError(null);

    try {
      const response = await googleLogin({
        idToken: googleIdToken,
        twoFactorCode: code,
      });

      if (response.success && response.data) {
        await handleLoginSuccess(response.data);
      } else {
        if (response.errorCode === "INVALID_TWO_FACTOR_CODE") {
          setVerifyError(translate("invalid_2fa_code"));
        } else {
          setVerifyError(response.error || translate("verification_failed"));
        }
      }
    } catch {
      setVerifyError(translate("verification_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStandardTwoFactorVerify = async () => {
    if (code.length !== 6) return;

    setIsLoading(true);
    setVerifyError(null);

    try {
      const verifyResponse = await verifyTwoFactor({
        identifier: formData.identifier,
        password: formData.password,
        twoFactorCode: code,
      });

      if (verifyResponse.success && verifyResponse.data) {
        await handleLoginSuccess(verifyResponse.data);
      } else {
        if (verifyResponse.errorCode === "INVALID_TWO_FACTOR_CODE") {
          setVerifyError(translate("invalid_2fa_code"));
        } else {
          setVerifyError(
            verifyResponse.error || translate("verification_failed"),
          );
        }
      }
    } catch {
      setVerifyError(translate("verification_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorVerify = async () => {
    if (authMethod === "google") {
      await handleGoogleTwoFactorVerify();
    } else {
      await handleStandardTwoFactorVerify();
    }
  };

  const handleLoginSuccess = async (loginData: TwoFactorVerifyResponse) => {
    localStorage.setItem("authToken", loginData.token);
    setUser(loginData.user);
    navigate("/main-menu");

    const settingsResponse = await getUserSettingsById({
      id: loginData.user.id,
    });
    if (settingsResponse.success && settingsResponse.data?.language) {
      setLanguage(settingsResponse.data.language);
    }
  };

  const handleGoogleSignIn = async (idToken: string) => {
    setIsLoading(true);
    setError(null);
    setGoogleIdToken(idToken);

    try {
      const response = await googleLogin({ idToken });

      if (response.success && response.data) {
        await handleLoginSuccess(response.data);
      } else {
        if (response.errorCode === "TWO_FACTOR_REQUIRED") {
          setAuthMethod("google");
          setStep("2FA");
        } else {
          setError(response.error || translate("google_login_failed"));
        }
      }
    } catch {
      setError(translate("google_login_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return {
    // State
    formData,
    isLoading,
    error,
    verifyError,
    step,
    code,
    authMethod,

    // Actions
    setCode,
    handleInputChange,
    handleLogin,
    handleTwoFactorVerify,
    handleGoogleSignIn,
    handleGoogleError,
    translate,
  };
};
