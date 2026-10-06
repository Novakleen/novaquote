import React from 'react';
import { Phone, Mail, MapPin, Globe, Facebook, Linkedin, Instagram, Youtube, ShieldCheck, FileText } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className='bg-[#2D3D2D] text-white pt-16 pb-8 border-t-8 border-[#E8B4C4]'>
      <div className='container mx-auto px-4'>
        <div className='max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12'>
          
          {/* Column 1: Company Info */}
          <div>
            <div className="flex items-center gap-3 mb-6">
                <img 
                  src="https://horizons-cdn.hostinger.com/e3f7a136-f9dc-4b51-b0bf-3cfef68c9a27/cc85daa33a07a54718f7dab25e8482fa.png" 
                  alt="NovaKleen Logo" 
                  className='w-10 h-10 rounded-full border border-[#E8B4C4]'
                />
                <h3 className='text-xl font-bold text-white'>NovaKleen</h3>
            </div>
            
            <p className='text-gray-300 mb-6 text-sm leading-relaxed'>
              {t('footer.description')}
            </p>
            <div className='flex items-center gap-4'>
              <a href="https://www.facebook.com/novakleen.eu" target="_blank" rel="noopener noreferrer" className='bg-[#3A4E3A] p-2 rounded-full hover:bg-[#E8B4C4] hover:text-[#2D3D2D] transition-all' aria-label="Facebook">
                <Facebook className='w-5 h-5' />
              </a>
              <a href="https://www.linkedin.com/company/novakleen-eu" target="_blank" rel="noopener noreferrer" className='bg-[#3A4E3A] p-2 rounded-full hover:bg-[#E8B4C4] hover:text-[#2D3D2D] transition-all' aria-label="LinkedIn">
                <Linkedin className='w-5 h-5' />
              </a>
              <a href="https://www.instagram.com/novakleen.eu" target="_blank" rel="noopener noreferrer" className='bg-[#3A4E3A] p-2 rounded-full hover:bg-[#E8B4C4] hover:text-[#2D3D2D] transition-all' aria-label="Instagram">
                <Instagram className='w-5 h-5' />
              </a>
              <a href="https://www.youtube.com/@NovaKleen" target="_blank" rel="noopener noreferrer" className='bg-[#3A4E3A] p-2 rounded-full hover:bg-[#E8B4C4] hover:text-[#2D3D2D] transition-all' aria-label="YouTube">
                <Youtube className='w-5 h-5' />
              </a>
            </div>
          </div>

          {/* Column 2: Contact */}
          <div>
            <h3 className='text-lg font-bold mb-6 text-[#E8B4C4]'>{t('footer.contact')}</h3>
            <ul className='space-y-4'>
              <li>
                <a href="tel:+32479535870" className='flex items-start gap-3 text-gray-300 hover:text-[#E8B4C4] transition-colors group'>
                  <Phone className='w-5 h-5 text-[#E8B4C4] mt-1' />
                  <span>+32 479 53 58 70</span>
                </a>
              </li>
              <li>
                <a href="mailto:remy@novakleen.be" className='flex items-start gap-3 text-gray-300 hover:text-[#E8B4C4] transition-colors group'>
                  <Mail className='w-5 h-5 text-[#E8B4C4] mt-1' />
                  <span>remy@novakleen.be</span>
                </a>
              </li>
              <li>
                <a href="https://novakleen.be/fr/homeowner" target="_blank" rel="noopener noreferrer" className='flex items-start gap-3 text-gray-300 hover:text-[#E8B4C4] transition-colors group'>
                  <Globe className='w-5 h-5 text-[#E8B4C4] mt-1' />
                  <span>novakleen.be</span>
                </a>
              </li>
              <li className='flex items-start gap-3 text-gray-300'>
                <MapPin className='w-5 h-5 text-[#E8B4C4] mt-1' />
                <span>{t('footer.zones')}</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Admin */}
          <div>
            <h3 className='text-lg font-bold mb-6 text-[#E8B4C4]'>{t('footer.legal')}</h3>
            <ul className='space-y-4 text-sm text-gray-300'>
              <li className='flex items-start gap-3'>
                <FileText className='w-5 h-5 text-gray-400 mt-0.5' />
                <div>
                  <span className='block font-medium text-white'>NovaKleen (groupe 2blox Srl)</span>
                  <span className='block mt-1'>TVA: BE 0798.080.762</span>
                </div>
              </li>
              <li className='flex items-start gap-3'>
                <ShieldCheck className='w-5 h-5 text-gray-400 mt-0.5' />
                <div>
                  <span className='block font-medium text-white'>{t('footer.insurance')}</span>
                  <span className='block mt-1'>Police n° 011.901.262.092</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 4: Quick Links */}
          <div>
            <h3 className='text-lg font-bold mb-6 text-[#E8B4C4]'>{t('footer.services')}</h3>
            <ul className='space-y-3 text-gray-300'>
              <li className='hover:text-[#E8B4C4] transition-colors'>• {t('footer.services_list.pressure')}</li>
              <li className='hover:text-[#E8B4C4] transition-colors'>• {t('footer.services_list.enzyme')}</li>
              <li className='hover:text-[#E8B4C4] transition-colors'>• {t('footer.services_list.demossing')}</li>
              <li className='hover:text-[#E8B4C4] transition-colors'>• {t('footer.services_list.waterproof')}</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='border-t border-[#3A4E3A] pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400'>
          <p>&copy; {new Date().getFullYear()} NovaKleen. {t('footer.rights')}</p>
          <div className='flex gap-6'>
            <a href="#" className='hover:text-[#E8B4C4] transition-colors'>{t('footer.terms')}</a>
            <a href="#" className='hover:text-[#E8B4C4] transition-colors'>{t('footer.privacy')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;