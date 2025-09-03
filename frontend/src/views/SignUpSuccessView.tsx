import React from "react";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import Text from "../components/Text";

import greenTick from "../assets/green-tick.png";

const SignUpSuccessView: React.FC = () => (
  <Background>
    <Card>
      <Logo />
      <Icon src={greenTick} alt="green-tick.png" className="w-2/5" />
      <Text>Your account has been sucessfully created!</Text>
      <Button>SIGN UP</Button>
    </Card>
  </Background>
);

export default SignUpSuccessView;
