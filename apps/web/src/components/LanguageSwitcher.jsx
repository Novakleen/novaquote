import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const labels = {
    en: 'English',
    fr: 'Français',
    nl: 'Nederlands'
  };

  const flags = {
    en: '🇬🇧',
    fr: '🇫🇷',
    nl: '🇧🇪'
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageSelect = (lang) => {
    changeLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-white hover:text-[#E8B4C4] hover:bg-white/10 gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase font-semibold">{language}</span>
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {Object.keys(labels).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageSelect(lang)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-100 transition-colors",
                  language === lang ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-700"
                )}
                role="menuitem"
              >
                <span className="text-lg leading-none">{flags[lang]}</span>
                <span className="flex-1">{labels[lang]}</span>
                {language === lang && <Check className="w-4 h-4 text-green-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;