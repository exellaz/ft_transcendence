import React from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import Input from "../components/Input";
import Status from "../components/Status";

const SignUpView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Background>
      <Card>
        <Logo />
        <Input placeholder="Username" />
        <Status text="Username is available" color="green" />
        <Input placeholder="Email" type="email" />
        <Input placeholder="Password" type="password" />
        <Input placeholder="Confirm password" type="password" />
        <Button onClick={() => navigate("/signup-success")}>SIGN UP</Button>
      </Card>
    </Background>
  );
};

export default SignUpView;
