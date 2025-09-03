import React, { useState } from "react";
import Background from "../components/Background";
import Card from "../components/Card";
import Logo from "../components/Logo";
import Input from "../components/Input";
import Button from "../components/Button";
import Divider from "../components/Divider";
import Popup from "../popups/SettingsPopup";

const PopupTest: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <Background>
      <Card className="flex justify-center">
        <Button onClick={() => setShowPopup(true)}>LOGIN</Button>
      </Card>
      <Popup open={showPopup} onClose={() => setShowPopup(false)} />
    </Background>
  );
};

export default PopupTest;
