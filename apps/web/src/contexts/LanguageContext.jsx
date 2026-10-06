import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTranslation, defaultLanguage, supportedLanguages } from '@/lib/i18n';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(defaultLanguage);

  // Initialize language based on URL or localStorage
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const firstSegment = pathSegments[1];
    
    // Check if the first segment is a supported language
    if (supportedLanguages.includes(firstSegment)) {
      setLanguage(firstSegment);
      localStorage.setItem('novaquote_lang', firstSegment);
    } else if (location.pathname === '/' || location.pathname === '') {
      // Root path "/" - Redirect to default language (FR)
      const savedLang = localStorage.getItem('novaquote_lang');
      
      // If we have a saved language that is supported, use it, otherwise default to FR
      const targetLang = (savedLang && supportedLanguages.includes(savedLang)) 
        ? savedLang 
        : defaultLanguage;
        
      setLanguage(targetLang);
      
      // If the target language is NOT English (since English is technically mapped to root in many setups, 
      // but here we want explicit FR default), we redirect.
      // However, the task says: "When users visit the site without a language prefix, automatically redirect them to /fr"
      if (targetLang === 'fr') {
        navigate('/fr', { replace: true });
      } else if (targetLang === 'nl') {
        navigate('/nl', { replace: true });
      }
      // If targetLang is 'en', we stay at root based on previous router logic? 
      // Or if we want strict prefixes now? The previous logic had English at root.
      // The prompt asks to "redirect them to /fr" specifically for default.
    }
  }, [location.pathname, navigate]);

  const changeLanguage = (newLang) => {
    if (!supportedLanguages.includes(newLang)) return;
    
    const pathSegments = location.pathname.split('/');
    const currentLangSegment = pathSegments[1];
    let newPath;

    // Logic to construct new path
    if (supportedLanguages.includes(currentLangSegment)) {
      // We are currently at /fr/something or /nl/something
      if (newLang === 'en') {
        // Switch to English (root)
        newPath = '/' + pathSegments.slice(2).join('/');
      } else {
        // Swap lang segment
        pathSegments[1] = newLang;
        newPath = pathSegments.join('/');
      }
    } else {
      // We are at /something (implies EN currently)
      if (newLang !== 'en') {
        // Add lang segment
        newPath = `/${newLang}${location.pathname === '/' ? '' : location.pathname}`;
      } else {
        // Stay at current path
        newPath = location.pathname;
      }
    }
    
    // Clean up double slashes if any
    newPath = newPath.replace('//', '/');
    if (newPath === '') newPath = '/';

    setLanguage(newLang);
    localStorage.setItem('novaquote_lang', newLang);
    navigate(newPath);
  };

  const t = useCallback((key, args) => {
    return getTranslation(language, key, args);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};