import React from "react";
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

  return (
    <PreLoginLayout>
      <Card>
        <Logo />
        <div className="w-full flex flex-col gap-2">
          <Input
            placeholder={translate("username")}
            icon={
              <img src="/assets/user.png" alt="user.png" className="w-10" />
            }
          />
          <Status text={translate("username_available")} color="green" />
        </div>
        <Input
          placeholder={translate("email")}
          type="email"
          icon={
            <img src="/assets/email.png" alt="email.png" className="w-10" />
          }
        />
        <Input
          placeholder={translate("password")}
          type="password"
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
        />
        <Input
          placeholder={translate("confirm_password")}
          type="password"
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
        />
        <Button onClick={() => navigate("/signup-success")}>
          {translate("signup")}
        </Button>
      </Card>
    </PreLoginLayout>
  );
};

export default SignUpView;
