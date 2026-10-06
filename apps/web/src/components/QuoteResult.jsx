import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Check, Tag, Lock, Phone, Mail, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';

const QuoteResult = ({ quote, coordinates }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    setIsUnlocked(false);
    setShowUnlockModal(false);
    setPhoneNumber('');
    setPhoneError('');
    setIsSubmitting(false);
    setShowEmailModal(false);
    setEmailAddress('');
    setEmailError('');
    setIsSendingEmail(false);
  }, [quote?.address, quote?.surfaceArea]);

  useEffect(() => {
    if (!isUnlocked && quote) {
      const timer = setTimeout(() => {
        setShowUnlockModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isUnlocked, quote]);

  const generatePdfDoc = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    const brandGreen = [45, 61, 45];
    const brandPink = [232, 180, 196];
    const brandLight = [252, 244, 247];
    
    const textGray = [55, 65, 81];
    const textLight = [107, 114, 128];
    const white = [255, 255, 255];

    let y = 20;

    doc.setFillColor(...brandGreen);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text("NovaKleen", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(...brandPink);
    doc.text("Expertise Toiture", 20, 28);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 220, 220);
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const refId = `NK-2025-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    doc.text(`Référence: ${refId}`, pageWidth - 20, 22, { align: 'right' });
    doc.text(`Date: ${dateStr}`, pageWidth - 20, 28, { align: 'right' });

    y = 60;

    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandGreen);
    doc.text("ESTIMATION", 20, y);

    y += 15;

    doc.setFillColor(...brandLight);
    doc.setDrawColor(...brandPink);
    doc.roundedRect(20, y, pageWidth - 40, 60, 3, 3, 'FD');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandGreen);
    doc.text(t('quote_result.address'), 30, y + 15);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textGray);
    const addressSplit = doc.splitTextToSize(quote.address, 90);
    doc.text(addressSplit, 30, y + 25);

    doc.setFont('helvetica', 'bold');
    doc.text(`${t('quote_result.surface')}: ${quote.surfaceArea} m²`, 30, y + 45);

    y += 75;

    const services = [
      {
        title: t('quote_result.step1_title'),
        desc: doc.splitTextToSize(t('quote_result.step1_desc'), pageWidth - 40),
        price: quote.pressureWashing.total,
        unitPrice: quote.pressureWashing.pricePerTranche,
        qty: quote.numTranches
      },
      {
        title: t('quote_result.step2_title'),
        desc: doc.splitTextToSize(t('quote_result.step2_desc'), pageWidth - 40),
        price: quote.enzyme.total,
        unitPrice: quote.enzyme.pricePerTranche,
        qty: quote.numTranches
      }
    ];

    services.forEach((service) => {
      const startY = y;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...brandGreen);
      doc.text(service.title, 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textLight);
      service.desc.forEach(line => {
        doc.text(line, 25, y);
        y += 5;
      });

      y += 3;
      doc.setFontSize(9);
      doc.setTextColor(...brandGreen);
      doc.text(`${service.qty} x 20m² × ${service.unitPrice.toFixed(2)}€`, 25, y);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${service.price.toFixed(2)} €`, pageWidth - 20, startY + 5, { align: 'right' });

      y += 8;
      doc.setDrawColor(...brandPink);
      doc.setLineWidth(0.5);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;
    });

    y += 5;
    const rightColX = pageWidth - 60;
    const valueColX = pageWidth - 20;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textGray);
    doc.text(t('quote_result.subtotal'), rightColX, y);
    doc.text(`${quote.subtotal.toFixed(2)} €`, valueColX, y, { align: 'right' });
    y += 8;

    if (quote.discount > 0) {
      doc.setTextColor(22, 163, 74); 
      doc.text(t('quote_result.discount'), rightColX, y);
      doc.text(`-${quote.discount.toFixed(2)} €`, valueColX, y, { align: 'right' });
      y += 8;
    }

    doc.setTextColor(...textGray);
    doc.text(t('quote_result.vat') + " (6%)", rightColX, y);
    doc.text(`${quote.tvaAmount.toFixed(2)} €`, valueColX, y, { align: 'right' });
    y += 12;

    doc.setFillColor(...brandGreen);
    doc.roundedRect(pageWidth - 100, y - 8, 80, 20, 2, 2, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text(t('quote_result.total_vat'), pageWidth - 90, y + 5);
    doc.text(`${quote.total.toFixed(2)} €`, pageWidth - 25, y + 5, { align: 'right' });

    y += 20;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(200, 50, 50);
    const disclaimer = t('quote_result.disclaimer_text');
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 40);
    doc.text(splitDisclaimer, 20, y);
    y += (splitDisclaimer.length * 5) + 10;

    if (y > pageHeight - 50) {
      doc.addPage();
      y = 40; 
    }

    const footerY = pageHeight - 35;
    doc.setFillColor(...brandGreen);
    doc.rect(0, footerY, pageWidth, 35, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text("NovaKleen - 2blox SRL", pageWidth / 2, footerY + 8, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text("TVA: BE 0798.080.762", pageWidth / 2, footerY + 14, { align: 'center' });
    doc.text("www.novakleen.be", pageWidth / 2, footerY + 26, { align: 'center' });

    return doc;
  };

  const handleDownload = async () => {
    if (!isUnlocked) {
      setShowUnlockModal(true);
      return;
    }

    try {
      const doc = await generatePdfDoc();
      doc.save(`Estimation_NovaKleen_${new Date().getTime()}.pdf`);

      toast({
        title: t('quote_result.success_download'),
        description: t('quote_result.success_download_desc')
      });

    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast({
        title: "Error",
        description: "PDF generation failed.",
        variant: "destructive"
      });
    }
  };

  const handleEmailClick = () => {
    if (!isUnlocked) {
      setShowUnlockModal(true);
      return;
    }
    setShowEmailModal(true);
  };

  const submitEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      setEmailError("Invalid email.");
      return;
    }
    
    setIsSendingEmail(true);
    setEmailError('');

    try {
      const { error } = await supabase
        .from('phone_submissions')
        .update({ email: emailAddress })
        .eq('phone_number', phoneNumber)
        .eq('address', quote.address);

      if (error) {
        const { error: insertError } = await supabase
          .from('phone_submissions')
          .insert([{ 
            phone_number: phoneNumber,
            address: quote.address,
            email: emailAddress
          }]);
          
        if (insertError) throw insertError;
      }

      toast({
        title: t('quote_result.email_saved'),
        description: t('quote_result.email_saved_desc')
      });
      setShowEmailModal(false);
      setEmailAddress('');

    } catch (error) {
      console.error("Email Saving Error:", error);
      setEmailError("Error saving email.");
      toast({
        title: "Error",
        description: "Error saving email.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const saveSubmission = async (validPhoneNumber, address) => {
    try {
      setIsSubmitting(true);
      
      // 1. Create HubSpot Lead via Edge Function
      let hubspotId = null;
      try {
        const { data: funcData, error: funcError } = await supabase.functions.invoke('create-hubspot-lead', {
          body: { address, phone_number: validPhoneNumber }
        });

        if (funcError) {
            console.warn('HubSpot Function Error:', funcError);
        } else if (funcData?.success && funcData?.hubspotId) {
            hubspotId = funcData.hubspotId;
        } else {
             // Handle case where function returns error (e.g. conflict) but status 200
             console.warn('HubSpot creation failed or returned no ID:', funcData);
        }
      } catch (hsError) {
        console.error('Error invoking create-hubspot-lead:', hsError);
        // Continue anyway to save to local DB
      }

      // 2. Save to Supabase DB
      const { error } = await supabase
        .from('phone_submissions')
        .insert([{ 
          phone_number: validPhoneNumber,
          address: address,
          hubspot_lead_id: hubspotId
        }]);

      if (error) {
          console.error('Error saving submission:', error);
          // If insert fails, we might want to alert, but validation already passed so we might just log
          throw error;
      }
      
      return true;
    } catch (err) {
      console.error('Unexpected error saving submission:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndUnlock = async () => {
    let isValid = true;
    const cleanNumber = phoneNumber.replace(/[\s\.\-\/]/g, '');
    const belgianPhoneRegex = /^(?:\+32|0)[0-9]{8,9}$/;

    if (!belgianPhoneRegex.test(cleanNumber)) {
      setPhoneError(t('quote_result.invalid_phone_desc'));
      isValid = false;
    } else {
      setPhoneError('');
    }

    if (isValid) {
      // Wait for submission (including HubSpot creation)
      await saveSubmission(cleanNumber, quote.address);
      
      setIsUnlocked(true);
      setShowUnlockModal(false);
      toast({
        title: t('quote_result.prices_unlocked'),
        description: t('quote_result.prices_unlocked_desc')
      });
    } else {
      toast({
        title: t('quote_result.invalid_phone'),
        description: t('quote_result.invalid_phone_desc'),
        variant: "destructive"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='border-t-2 border-[#E8B4C4] pt-8'
    >
      <h3 className='text-2xl font-bold text-[#2D3D2D] mb-6 flex items-center gap-2'>
        <Check className='w-6 h-6 text-[#E8B4C4]' />
        {t('quote_result.title')}
      </h3>

      <div className='bg-[#FCF4F7] rounded-xl p-6 mb-6 border border-[#E8B4C4]/30'>
        <div className='grid md:grid-cols-2 gap-6'>
          <div>
            <p className='text-sm text-gray-600 mb-1'>{t('quote_result.address')}</p>
            <p className='font-semibold text-[#2D3D2D]'>{quote.address}</p>
          </div>
          <div>
            <p className='text-sm text-gray-600 mb-1'>{t('quote_result.surface')}</p>
            <p className='font-semibold text-[#2D3D2D]'>{quote.surfaceArea} m²</p>
          </div>
        </div>
      </div>

      <div className="relative">
        
        {!isUnlocked && (
          <div 
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/10 backdrop-blur-[2px] rounded-xl border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
            onClick={() => setShowUnlockModal(true)}
            title={t('quote_result.click_to_unlock')}
          >
            <div className="flex flex-col items-center text-[#2D3D2D]">
              <Lock className="w-10 h-10 mb-2 text-[#E8B4C4]" />
              <span className="font-semibold text-sm uppercase tracking-wider bg-white/80 px-4 py-1 rounded-full shadow-sm">{t('quote_result.locked_prices')}</span>
            </div>
          </div>
        )}

        <div className={!isUnlocked ? "filter blur-sm select-none pointer-events-none transition-all duration-500" : "transition-all duration-500"}>
          <div className='space-y-4 mb-6'>
            <div className='bg-white border-2 border-gray-100 rounded-lg p-4 shadow-sm'>
              <div className='flex justify-between items-center mb-2'>
                <div>
                  <p className='font-semibold text-[#2D3D2D]'>{t('quote_result.step1_title')}</p>
                  <p className='text-sm text-gray-600 mt-1 whitespace-pre-line'>
                    {t('quote_result.step1_desc')}
                  </p>
                  <p className='text-xs text-gray-500 mt-2'>
                    {t('quote_result.tranches_info', { tranches: quote.numTranches, price: quote.pressureWashing.pricePerTranche.toFixed(2) })}
                  </p>
                </div>
                <p className='text-xl font-bold text-[#2D3D2D] ml-4'>
                  {quote.pressureWashing.total.toFixed(2)}€
                </p>
              </div>
            </div>

            <div className='bg-white border-2 border-gray-100 rounded-lg p-4 shadow-sm'>
              <div className='flex justify-between items-center mb-2'>
                <div>
                  <p className='font-semibold text-[#2D3D2D]'>{t('quote_result.step2_title')}</p>
                  <p className='text-sm text-gray-600 mt-1 whitespace-pre-line'>
                    {t('quote_result.step2_desc')}
                  </p>
                  <p className='text-xs text-gray-500 mt-2'>
                    {t('quote_result.tranches_info', { tranches: quote.numTranches, price: quote.enzyme.pricePerTranche.toFixed(2) })}
                  </p>
                </div>
                <p className='text-xl font-bold text-[#2D3D2D] ml-4'>
                  {quote.enzyme.total.toFixed(2)}€
                </p>
              </div>
            </div>
          </div>

          <div className='space-y-3 mb-6'>
            <div className='flex justify-between items-center text-gray-700'>
              <span className='font-medium'>{t('quote_result.subtotal')}</span>
              <span className='font-semibold'>{quote.subtotal.toFixed(2)}€</span>
            </div>

            {quote.discount > 0 && (
              <div className='flex justify-between items-center text-green-600'>
                <span className='font-medium flex items-center gap-2'>
                  <Tag className='w-4 h-4' />
                  {t('quote_result.discount')}
                </span>
                <span className='font-semibold'>-{quote.discount.toFixed(2)}€</span>
              </div>
            )}

            <div className='flex justify-between items-center text-gray-700'>
              <span className='font-medium'>{t('quote_result.vat')} (6%)</span>
              <span className='font-semibold'>{quote.tvaAmount.toFixed(2)}€</span>
            </div>
          </div>

          <div className='bg-[#2D3D2D] rounded-xl p-6 text-white mb-6 border-2 border-[#E8B4C4]'>
            <div className='flex justify-between items-center'>
              <div>
                <p className='text-[#E8B4C4] text-sm mb-1'>{t('quote_result.total_vat')}</p>
                <p className='text-3xl font-bold'>{quote.total.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>{t('quote_result.disclaimer_title')}:</strong> {t('quote_result.disclaimer_text')}
            </p>
          </div>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row gap-3'>
        <Button
          onClick={handleDownload}
          disabled={!isUnlocked}
          className='flex-1 bg-[#2D3D2D] hover:bg-[#3A4E3A] text-white py-6 text-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-[#E8B4C4]'
        >
          <Download className='w-5 h-5 mr-2 text-[#E8B4C4]' />
          {t('quote_result.download_pdf')}
        </Button>
        <Button
          variant="outline"
          onClick={handleEmailClick}
          disabled={!isUnlocked}
          className='flex-1 py-6 text-lg font-semibold transition-all hover:bg-[#FCF4F7] hover:border-[#E8B4C4] disabled:opacity-50 disabled:cursor-not-allowed text-[#2D3D2D]'
        >
          <Mail className="w-5 h-5 mr-2" />
          {t('quote_result.receive_email')}
        </Button>
      </div>

      <p className='text-xs text-gray-500 text-center mt-4'>
        {t('quote_result.validity')}
      </p>

      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#2D3D2D]">
              <Lock className="w-5 h-5 text-[#E8B4C4]" />
              {t('quote_result.unlock_title')}
            </DialogTitle>
            <DialogDescription>
              {t('quote_result.unlock_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t('quote_result.phone_label')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel" 
                  placeholder={t('quote_result.phone_placeholder')}
                  className={`pl-10 ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#2D3D2D]'}`}
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if(phoneError) setPhoneError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') validateAndUnlock();
                  }}
                  autoFocus
                  disabled={isSubmitting}
                  autoComplete="tel"
                />
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button 
              type="button" 
              onClick={validateAndUnlock} 
              className="w-full bg-[#2D3D2D] hover:bg-[#3A4E3A] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('quote_result.validating_btn')}
                </>
              ) : t('quote_result.view_price_btn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#2D3D2D]">
              <Mail className="w-5 h-5 text-[#E8B4C4]" />
              {t('quote_result.receive_modal_title')}
            </DialogTitle>
            <DialogDescription>
              {t('quote_result.receive_modal_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">
                {t('quote_result.email_label')}
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email" 
                  placeholder={t('quote_result.email_placeholder')}
                  className={`${emailError ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#2D3D2D]'}`}
                  value={emailAddress}
                  onChange={(e) => {
                    setEmailAddress(e.target.value);
                    if(emailError) setEmailError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitEmail();
                  }}
                  disabled={isSendingEmail}
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-500 mt-1">{emailError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setShowEmailModal(false)}
              disabled={isSendingEmail}
            >
              {t('quote_result.cancel')}
            </Button>
            <Button 
              type="button" 
              onClick={submitEmail} 
              className="bg-[#2D3D2D] hover:bg-[#3A4E3A] text-white min-w-[100px]"
              disabled={isSendingEmail}
            >
              {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : t('quote_result.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default QuoteResult;