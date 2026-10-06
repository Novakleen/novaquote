import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Header = ({ onLogoSecret }) => {
  const logoClicksRef = useRef(0);
  const resetTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleLogoClick = () => {
    logoClicksRef.current += 1;

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    if (logoClicksRef.current >= 5) {
      logoClicksRef.current = 0;
      onLogoSecret?.();
      return;
    }

    resetTimerRef.current = setTimeout(() => {
      logoClicksRef.current = 0;
    }, 1400);
  };

  const { t } = useTranslation();

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className='bg-[#2D3D2D] text-white py-4 shadow-lg border-b-4 border-[#E8B4C4]'
    >
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <button
              type="button"
              onClick={handleLogoClick}
              aria-label="Logo NovaKleen"
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B4C4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2D3D2D]"
            >
              <img 
                src="https://horizons-cdn.hostinger.com/e3f7a136-f9dc-4b51-b0bf-3cfef68c9a27/cc85daa33a07a54718f7dab25e8482fa.png" 
                alt="NovaKleen Logo" 
                className='w-14 h-14 rounded-full border-2 border-[#E8B4C4]'
              />
            </button>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold tracking-tight'>NovaKleen</h1>
              <p className='text-sm text-[#E8B4C4] font-medium'>{t('header.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:block">
              <a href="tel:+32479535870" className="text-[#E8B4C4] font-bold hover:text-white transition-colors">
                +32 479 53 58 70
              </a>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;