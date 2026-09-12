import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import { translations, TranslationSchema, AVAILABLE_LANGUAGES } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationSchema;
  languages: typeof AVAILABLE_LANGUAGES;
}

const STORAGE_KEY = 'obsidian_vault_lang';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved && translations[saved]) {
        return saved;
      }
      // Detect browser language if matches
      const browserLang = navigator.language?.slice(0, 2).toLowerCase();
      if (browserLang === 'th') return 'th';
      if (browserLang === 'ja') return 'ja';
      if (browserLang === 'zh') return 'zh';
      if (browserLang === 'es') return 'es';
    } catch (e) {
      console.warn('Could not read language from localStorage:', e);
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.setAttribute('lang', lang);
    } catch (e) {
      console.warn('Could not persist language:', e);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const currentTranslations = translations[language] || translations.en;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: currentTranslations,
        languages: AVAILABLE_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
