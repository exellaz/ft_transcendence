import React from "react";
import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";

const MainMenuView: React.FC = () => (
  <Background>
    <Card>
      <Logo />
      <Button variant="big">TOURNAMENT MODE</Button>
      <Button variant="big">NORMAL MODE</Button>
      <Button variant="big">SETTINGS</Button>
    </Card>
  </Background>
);

export default MainMenuView;
