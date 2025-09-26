import React, { use } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import Input from "../components/Input";
import PreLoginLayout from "../layout/PreLoginLayout";
import Status from "../components/Status";

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
  const [usernameStatus, setUsernameStatus] = React.useState<{
    message: string;
    color: "green" | "red";
  } | null>(null);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));

    // Clear error when user starts typing
    if (error) setError(null);

    // Clear username status when username changes
    if (field === 'username') setUsernameStatus(null);
  };

  const validateForm = (): string | null => {
    if (!formData.username.trim()) return "Username is required";
    if (!formData.email.trim()) return "Email is required";
    if (!formData.password) return "Password is required";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return "Invalid email format";

    // Password validation
    if (formData.password.length < 8) return "Password must be at least 8 characters long";

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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // SUCCESS: Store token and redirect
      localStorage.setItem('token', data.token);
      navigate('/signup-success');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          onChange={handleInputChange('username')}
          icon={<img src="/assets/user.png" alt="user.png" className="w-10" />}
        />

        {usernameStatus && (
          <Status text={usernameStatus.message} color={usernameStatus.color} />
        )}

        <Input
          placeholder={translate("email")}
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          icon={<img src="/assets/email.png" alt="email.png" className="w-10" />}
        />

        <Input
          placeholder={translate("password")}
          type="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
        />

        <Input
          placeholder={translate("confirm_password")}
          type="password"
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
        />

        {/* 🎯 NEW: Error display */}
        {error && (
          <Status text={error} color="red" />
        )}

        <Button
          onClick={handleSignUp}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : translate("signup")}
        </Button>
      </Card>
    </PreLoginLayout>
  );
};

export default SignUpView;
