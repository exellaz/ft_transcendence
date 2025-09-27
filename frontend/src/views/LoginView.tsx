import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";

import Button from "../components/Button";
import Card from "../components/Card";
import Divider from "../components/Divider";
import Input from "../components/Input";
import Logo from "../components/Logo";
import PreLoginLayout from "../layout/PreLoginLayout";
import TextButton from "../components/TextButton";

const LoginView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`LoginView.${key}`);
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [formData, setFormData] = React.useState({
    identifier: "",
    password: "",
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));

    if (error) setError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.identifier.trim()) return "Username or email is required";
    if (!formData.password) return "Password is required";
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Success: Store token and user data, then redirect
      localStorage.setItem("authToken", data.data.token);
      setUser(data.data.user);
      navigate("/main-menu");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleLogin();
    }
  };

  return (
    <PreLoginLayout>
      <Card>
        <Logo />
        <Input
          placeholder={translate("username")} // TODO: change to "username or email"
          value={formData.identifier}
          onChange={handleInputChange("identifier")}
          onKeyDown={handleKeyPress}
          icon={<img src="/assets/user.png" alt="user.png" className="w-10" />}
        />
        <Input
          placeholder={translate("password")}
          type="password"
          value={formData.password}
          onChange={handleInputChange("password")}
          onKeyDown={handleKeyPress}
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
        />
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        {/* <Button variant="longYellow" onClick={() => navigate("/main-menu")}>{translate("login")}</Button> */}
        <Button
          variant="longYellow"
          onClick={handleLogin}
        >
          {isLoading ? translate("loading") : translate("login")}
        </Button>
        <Divider />
        <Button
          variant="longWhite"
          className="flex-row-center gap-2"
        >
          <div>
            <img src="/assets/google.png" alt="google.png" className="w-5" />
          </div>
          {translate("continue_with_google")}
        </Button>
        <TextButton onClick={() => navigate("/signup")}>
          {translate("signup_prompt")}
        </TextButton>
      </Card>
    </PreLoginLayout>
  );
};

export default LoginView;
