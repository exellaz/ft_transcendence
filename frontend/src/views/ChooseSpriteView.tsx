import React from "react";

import Background from "../components/Background";
import Card from "../components/Card";
import ChooseSpriteContents from "../components/ChooseSpriteContents";

const ChooseSpriteView: React.FC = () => {
  return (
    <Background>
      <Card size="wide">
        <ChooseSpriteContents variant="tournament" />
      </Card>
    </Background>
  );
};

export default ChooseSpriteView;
