import React, { createContext, useContext, useState } from 'react';
import { getTranslation } from '../locales/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('app-lang') || null);

  const setLanguage = (l) => {
    localStorage.setItem('app-lang', l);
    setLang(l);
  };

  const t = getTranslation(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
