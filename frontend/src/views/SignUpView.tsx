import React from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import Input from "../components/Input";
import Status from "../components/Status";

const SignUpView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Background>
      <Card>
        <Logo />
        <Input
          placeholder="Username"
          className="mb-5"
          icon={<img src="/assets/user.png" alt="user.png" className="w-10" />}
        />
        <Status text="Username is available" color="green" />
        <Input
          placeholder="Email"
          type="email"
          className="mb-5"
          icon={
            <img src="/assets/email.png" alt="email.png" className="w-10" />
          }
        />
        <Input
          placeholder="Password"
          type="password"
          className="mb-5"
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
        />
        <Input
          placeholder="Confirm password"
          type="password"
          className="mb-5"
          icon={<img src="/assets/lock.png" alt="lock.png" className="w-10" />}
        />
        <Button onClick={() => navigate("/signup-success")}>SIGN UP</Button>
      </Card>
    </Background>
  );
};

export default SignUpView;
