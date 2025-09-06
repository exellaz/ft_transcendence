import React from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Divider from "../components/Divider";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import Input from "../components/Input";
import TextButton from "../components/TextButton";

const LoginView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Background>
      <Card>
        <Logo />
        <Input placeholder="Username" />
        <Input placeholder="Password" type="password" />
        <Button onClick={() => navigate("/main-menu")}>LOGIN</Button>
        <Divider />
        <Button variant="defaultWhite" className="flex justify-center items-center gap-2">
          <div>
            <Icon src="/assets/google.png" alt="google.png" className="w-5" />
          </div>
          CONTINUE WITH GOOGLE
        </Button>
        <TextButton onClick={() => navigate("/signup")}>
          Don’t have an account? Sign up
        </TextButton>
      </Card>
    </Background>
  );
};

export default LoginView;
