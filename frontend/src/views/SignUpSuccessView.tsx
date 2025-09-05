import React from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import Text from "../components/Text";

import greenTick from "../assets/green-tick.png";

const SignUpSuccessView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Background>
      <Card>
        <Logo />
        <Icon src={greenTick} alt="green-tick.png" className="w-2/5" />
        <Text>Your account has been sucessfully created!</Text>
        <Button onClick={() => navigate("/login")}>LOGIN</Button>
      </Card>
    </Background>
  );
};

export default SignUpSuccessView;
