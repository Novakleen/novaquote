import React, { useRef, useState } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import QuoteGenerator from '@/components/QuoteGenerator';
import GoogleReviews from '@/components/GoogleReviews';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';

// Importing additional components for the new order
import WelcomeMessage from '@/components/WelcomeMessage';
import AddressSearchModule from '@/components/AddressSearchModule';
import GoogleSolarCalculator from '@/components/GoogleSolarCalculator';

// Inner component to use the translation hook
const Home = () => {
  const { t } = useTranslation();
  const [showSolarCalculator, setShowSolarCalculator] = useState(false);
  const solarSecretRevealedRef = useRef(false);

  const revealSolarCalculator = () => {
    if (solarSecretRevealedRef.current) return;
    solarSecretRevealedRef.current = true;
    setShowSolarCalculator(true);
  };
  
  const pageTitle = t('meta.title');
  const pageDescription = t('meta.description');
  const brandLogoUrl = "https://horizons-cdn.hostinger.com/e3f7a136-f9dc-4b51-b0bf-3cfef68c9a27/cc85daa33a07a54718f7dab25e8482fa.png";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="icon" type="image/png" href={brandLogoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={brandLogoUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={brandLogoUrl} />
      </Helmet>

      <div className='min-h-screen bg-gray-50 flex flex-col'>
        <Header onLogoSecret={revealSolarCalculator} />
        <main className='flex-grow pb-16'>
          {/* 1. QuoteGenerator component */}
          <section className='pt-4 pb-12'>
            <QuoteGenerator />
          </section>

          {showSolarCalculator && (
            <section className="pb-12 bg-gray-50">
              <GoogleSolarCalculator />
            </section>
          )}

          {/* 2. GoogleReviews after QuoteGenerator */}
          <section className="pt-8 pb-4 bg-gradient-to-b from-white to-gray-50">
            <GoogleReviews />
          </section>

          <section className="py-16">
            <WelcomeMessage />
          </section>
        </main>
        <Footer />
        <Toaster />
      </div>
    </>
  );
};

const NewSearchPage = () => {
  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
       <Header />
       <main className="flex-grow pt-20">
         <AddressSearchModule />
       </main>
       <Footer />
       <Toaster />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Routes>
          <Route path="/address-search" element={<NewSearchPage />} />
          <Route path="/fr" element={<Home />} />
          <Route path="/nl" element={<Home />} />
          <Route path="/" element={<Home />} />
          {/* Catch all redirect to English */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;