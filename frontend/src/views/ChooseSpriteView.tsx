import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Card from "../components/Card";
import ChooseSpriteContents from "../components/ChooseSpriteContents";

const ChooseSpriteView: React.FC = () => {
  const [selectedSprite, setSelectedSprite] = useState<string>("");
  const navigate = useNavigate();
  return (
    <Background>
      <Card size="wide">
        <ChooseSpriteContents
          selected={selectedSprite}
          onSelectSprite={setSelectedSprite}
          onConfirm={() => {
            alert(`Confirmed sprite selection: ${selectedSprite}`);
            navigate("/tournament");
          }}
        />
      </Card>
    </Background>
  );
};

export default ChooseSpriteView;
