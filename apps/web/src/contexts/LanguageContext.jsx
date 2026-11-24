import React, { createContext, useContext, useState, useCallback } from 'react';
import { TRANSLATIONS, SUPPORTED_LANGS } from '../i18n';

function detectLang() {
  const saved = localStorage.getItem('app_lang');
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  const browser = navigator.language?.slice(0, 2);
  if (browser === 'ja') return 'ja';
  if (browser === 'zh') return 'zh';
  if (browser === 'en') return 'en';
  return 'ko';
}

export const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(detectLang);

  const changeLang = useCallback((code) => {
    if (!SUPPORTED_LANGS.includes(code)) return;
    setLang(code);
    localStorage.setItem('app_lang', code);
    document.documentElement.setAttribute('lang', code);
  }, []);

  const t = useCallback((key, vars) => {
    let text = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.ko[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, SUPPORTED_LANGS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
