import { useCallback, useState } from "react";
import { translations } from "../data/translations.js";

const STORAGE_KEY = "cineverse-language";

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && translations[saved] ? saved : "en";
  } catch {
    return "en";
  }
}

export function useLanguage() {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    if (!translations[nextLanguage]) return;

    setLanguageState(nextLanguage);

    try {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // The interface still works if browser storage is unavailable.
    }
  }, []);

  const t = useCallback(
    (key) => translations[language]?.[key] ?? translations.en[key] ?? key,
    [language],
  );

  return { language, setLanguage, t };
}