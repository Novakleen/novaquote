import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Award, Clock, ThumbsUp } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const Guarantee = () => {
  const { t } = useTranslation();

  const guarantees = [
    {
      icon: Shield,
      title: t('guarantee.warranty_2y'),
      description: t('guarantee.warranty_desc')
    },
    {
      icon: Award,
      title: t('guarantee.quality'),
      description: t('guarantee.quality_desc')
    },
    {
      icon: Clock,
      title: t('guarantee.rapid'),
      description: t('guarantee.rapid_desc')
    },
    {
      icon: ThumbsUp,
      title: t('guarantee.satisfaction'),
      description: t('guarantee.satisfaction_desc')
    }
  ];

  return (
    <section className='bg-white py-16'>
      <div className='container mx-auto px-4'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className='max-w-5xl mx-auto'
        >
          <h2 className='text-3xl font-bold text-center text-gray-800 mb-12'>
            {t('guarantee.title')}
          </h2>

          <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {guarantees.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className='text-center group'
              >
                <div className='inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-600 transition-colors duration-300'>
                  <item.icon className='w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300' />
                </div>
                <h3 className='text-lg font-bold text-gray-800 mb-2'>
                  {item.title}
                </h3>
                <p className='text-gray-600 text-sm'>
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Guarantee;