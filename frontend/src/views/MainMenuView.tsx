import React from "react";
import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import Input from "../components/Input";
import Status from "../components/Status";

const MainMenuView: React.FC = () => (
  <Background>
    <Card>
      <Logo />
      <Input placeholder="Username" />
      <Status text="Username is available" color="green" />
      <Input placeholder="Email" type="email" />
      <Input placeholder="Password" type="password" />
      <Input placeholder="Confirm password" type="password" />
      <Button>SIGN UP</Button>
    </Card>
  </Background>
);

export default MainMenuView;
