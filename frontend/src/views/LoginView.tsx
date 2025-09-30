import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

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

  return (
    <PreLoginLayout>
      <Card>
        <Logo />
        <Input
          placeholder={translate("username")}
          icon={<img src="/assets/user.png" alt="user.png" className="w-10" />}
        />
        <Input
          placeholder={translate("password")}
          type="password"
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
        />
		{/* change the redirect */}
        <Button variant="longYellow" onClick={() => navigate("/mock")}>{translate("login")}</Button>
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
