import React from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import Text from "../components/Text";

const SignUpSuccessView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Background>
      <Card>
        <Logo />
        <Icon src="/assets/green-tick.png" alt="green-tick.png" className="w-2/5" />
        <Text>Your account has been sucessfully created!</Text>
        <Button onClick={() => navigate("/login")}>LOGIN</Button>
      </Card>
    </Background>
  );
};

export default SignUpSuccessView;
