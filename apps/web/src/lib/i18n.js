import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import nl from '@/locales/nl.json';

const translations = {
  en,
  fr,
  nl
};

export const defaultLanguage = 'fr';
export const supportedLanguages = ['en', 'fr', 'nl'];

/**
 * Get translation for a given key and language.
 * Supports nested keys using dot notation (e.g., 'header.subtitle').
 * Supports interpolation (e.g., '{count} items' -> args={count: 5}).
 */
export const getTranslation = (lang, key, args = {}) => {
  const dictionary = translations[lang] || translations[defaultLanguage];
  
  const keys = key.split('.');
  let value = dictionary;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key} for language: ${lang}`);
      return key; // Fallback to key itself
    }
  }

  if (typeof value === 'string' && args) {
    Object.keys(args).forEach(argKey => {
      value = value.replace(`{${argKey}}`, args[argKey]);
    });
  }

  return value;
};

export default translations;