import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const Testimonials = () => {
  const { t } = useTranslation();
  
  const testimonials = [
    {
      name: 'Marie Dubois',
      location: 'Paris 15ème',
      rating: 5,
      text: 'Service impeccable ! Mon toit est comme neuf après leur intervention. L\'équipe est très professionnelle et le devis était très précis.',
      date: 'Il y a 2 semaines'
    },
    {
      name: 'Jean Martin',
      location: 'Versailles',
      rating: 5,
      text: 'Excellent rapport qualité-prix. Le traitement enzymatique a vraiment fait la différence. Je recommande vivement leurs services.',
      date: 'Il y a 1 mois'
    },
    {
      name: 'Sophie Laurent',
      location: 'Saint-Germain-en-Laye',
      rating: 5,
      text: 'Très satisfaite du résultat. L\'équipe est ponctuelle et respectueuse. Le nettoyage a été fait dans les règles de l\'art.',
      date: 'Il y a 3 semaines'
    }
  ];

  return (
    <section className='bg-gray-50 py-16'>
      <div className='container mx-auto px-4'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className='max-w-5xl mx-auto'
        >
          <h2 className='text-3xl font-bold text-center text-gray-800 mb-4'>
            {t('testimonials.title')}
          </h2>
          <p className='text-gray-600 text-center mb-12'>
            {t('testimonials.subtitle')}
          </p>

          <div className='grid md:grid-cols-3 gap-8'>
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className='bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300'
              >
                <div className='flex items-center gap-1 mb-4'>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className='w-5 h-5 fill-yellow-400 text-yellow-400' />
                  ))}
                </div>

                <Quote className='w-8 h-8 text-blue-200 mb-3' />

                <p className='text-gray-700 mb-4 italic'>
                  "{testimonial.text}"
                </p>

                <div className='border-t border-gray-200 pt-4'>
                  <p className='font-semibold text-gray-800'>
                    {testimonial.name}
                  </p>
                  <p className='text-sm text-gray-600'>
                    {testimonial.location}
                  </p>
                  <p className='text-xs text-gray-500 mt-1'>
                    {testimonial.date}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;