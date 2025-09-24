import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zhs from "./locales/zhs.json";
import zht from "./locales/zht.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zhs: { translation: zhs },
    zht: { translation: zht },
  },
  lng: localStorage.getItem("lang") || "zhs",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
