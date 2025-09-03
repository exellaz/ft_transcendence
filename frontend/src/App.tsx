import React from "react";
import Background from "./components/Background";
import Card from "./components/Card";
import Logo from "./components/Logo";

const App: React.FC = () => (
  <Background>
    <Card>
      <Logo />
    </Card>
  </Background>
);

export default App;
