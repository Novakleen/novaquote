import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

const WelcomeMessage = () => {
  const { t } = useTranslation();
  return (
    <motion.p
      className='text-sm text-white leading-5 w-full'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      {t('welcome.text')}
    </motion.p>
  );
};

export default WelcomeMessage;