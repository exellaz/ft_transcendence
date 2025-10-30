import type React from "react";
import OtpInput from "react-otp-input";

interface OtpInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  numInputs?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

type OtpInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export default function OtpInputField({
  value,
  onChange,
  numInputs = 6,
  onKeyDown,
}: OtpInputFieldProps) {
  return (
    <OtpInput
      value={value}
      onChange={onChange}
      numInputs={numInputs}
      shouldAutoFocus
      inputType="tel"
      renderInput={(props: OtpInputProps) => (
        <input
          {...props}
          onKeyDown={(e) => {
            props.onKeyDown?.(e);
            onKeyDown?.(e);
          }}
        />
      )}
      containerStyle={{
        display: "flex",
        justifyContent: "center",
        gap: "0.5rem",
      }}
      inputStyle={{
        width: "2.5rem",
        height: "2.5rem",
        fontSize: "1.25rem",
        textAlign: "center",
        color: "#ffffff",
        borderRadius: "0.75rem",
        border: "2px solid #FACC15",
        outline: "none",
        transition: "all 0.2s ease",
      }}
    />
  );
}
