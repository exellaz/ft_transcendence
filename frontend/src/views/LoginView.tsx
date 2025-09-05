import React from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Divider from "../components/Divider";
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
        <Button onClick = {() => navigate("/main-menu")}>LOGIN</Button>
        <Divider />
        <Button variant="defaultRed">GOOGLE</Button>
        <TextButton onClick = {() => navigate("/signup")}>Don’t have an account? Sign up</TextButton>
      </Card>
    </Background>
  );
};

export default LoginView;
