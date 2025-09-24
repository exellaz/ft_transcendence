import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import PreLoginLayout from "../layout/PreLoginLayout";

const SignUpSuccessView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SignUpSuccessView.${key}`);
  const navigate = useNavigate();

  return (
    <PreLoginLayout>
      <Card>
        <Logo />
        <img
          src="/assets/green-tick.png"
          alt="green-tick.png"
          className="w-[40%]"
        />
        <p className="text-white text-3xl text-center">
          {translate("success_message")}
        </p>
        <Button onClick={() => navigate("/login")}>{translate("login")}</Button>
      </Card>
    </PreLoginLayout>
  );
};

export default SignUpSuccessView;
