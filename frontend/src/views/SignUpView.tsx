import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import Input from "../components/Input";
import PreLoginLayout from "../layout/PreLoginLayout";
import Status from "../components/Status";
import { register } from "../lib/usersApiClient";

const SignUpView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SignUpView.${key}`);
  const navigate = useNavigate();

  const [formData, setFormData] = React.useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      // Clear error when user starts typing
      if (error) setError(null);
    };

  // simple frontend validation mainly checking for empty fields and password match
  const validateForm = (): string | null => {
    if (!formData.username.trim()) return translate("username_required");
    if (!formData.email.trim()) return translate("email_required");
    if (!formData.password) return translate("password_required");
    if (formData.password !== formData.confirmPassword)
      return translate("password_mismatch");
    return null;
  };

  const handleSignUp = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      const errorMessages: Record<string, string> = {
        USERNAME_INVALID: translate("username_invalid"),
        USERNAME_TOO_SHORT: translate("username_too_short"),
        USERNAME_TOO_LONG: translate("username_too_long"),
        USERNAME_ALREADY_EXISTS: translate("username_already_exists"),
        EMAIL_INVALID: translate("email_invalid"),
        EMAIL_ALREADY_EXISTS: translate("email_already_exists"),
        PASSWORD_TOO_WEAK: translate("password_too_weak"),
        PASSWORD_TOO_SHORT: translate("password_too_short"),
        PASSWORD_TOO_LONG: translate("password_too_long"),
      };

      if (!response.success || !response.data) {
        setError(
          response.errorCode && typeof response.errorCode === "string"
            ? errorMessages[response.errorCode] ||
                translate("registration_failed")
            : translate("registration_failed"),
        );
        return;
      }

      // SUCCESS: Store token and redirect
      localStorage.setItem("authToken", response.data.token);
      navigate("/signup-success");
    } catch {
      setError(translate("registration_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PreLoginLayout>
      <Card>
        <Logo />

        <Input
          placeholder={translate("username")}
          value={formData.username}
          onChange={handleInputChange("username")}
          icon={<img src="/assets/user.png" alt="user.png" className="w-10" />}
          maxLength={30}
        />

        <Input
          placeholder={translate("email")}
          type="email"
          value={formData.email}
          onChange={handleInputChange("email")}
          icon={
            <img src="/assets/email.png" alt="email.png" className="w-10" />
          }
          maxLength={254}
        />

        <Input
          placeholder={translate("password")}
          type="password"
          value={formData.password}
          onChange={handleInputChange("password")}
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
          maxLength={128}
        />

        <Input
          placeholder={translate("confirm_password")}
          type="password"
          value={formData.confirmPassword}
          onChange={handleInputChange("confirmPassword")}
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
          maxLength={128}
        />

        {error && <Status text={error} color="red" />}

        <Button onClick={handleSignUp} disabled={isLoading}>
          {isLoading ? translate("creating_account") : translate("signup")}
        </Button>
      </Card>
    </PreLoginLayout>
  );
};

export default SignUpView;
