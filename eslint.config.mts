import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import { verify } from "crypto";
import { version } from "os";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-empty-interface": "off",
    },
  },
  // disable react/prop-types for TS files
  // ESLint’s React plugin (eslint-plugin-react) assumes you’re using PropTypes for runtime prop validation,
  // even though you’re using TypeScript interfaces.
  // TypeScript already enforces prop types at compile time, so this rule is redundant.
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "react/prop-types": "off",
    },
  },
  eslintConfigPrettier,
]);
