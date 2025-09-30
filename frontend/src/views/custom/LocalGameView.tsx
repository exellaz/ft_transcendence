import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import Card from "../../components/Card";
import RoomLayout from "../../layout/RoomLayout";

const LocalGameView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`LocalGameView.${key}`);
 
  return (
    <RoomLayout>
      <Card>
        Hello
      </Card>
    </RoomLayout>
  );
};

export default LocalGameView;
