
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CREDIT_PACKAGES } from './constants';
import CreditPackage from './components/CreditPackage';
import PaymentForm from './components/PaymentForm';
import { initiatePayment } from './utils/payment';
import usePaymentStatus from './hooks/usePaymentStatus';

const BuyCreditsPage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Check for payment redirect
  usePaymentStatus();

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId);
    setError(null);
    setDetailedError(null);
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !user) return;
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter a valid phone number to proceed with payment.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setDetailedError(null);
    
    try {
      const selectedPkg = CREDIT_PACKAGES.find(pkg => pkg.id === selectedPackage);
      if (!selectedPkg) return;
      
      // Get payment link and redirect
      const paymentLink = await initiatePayment(selectedPkg, user, phoneNumber);
      window.location.href = paymentLink;
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      setError(error.message || 'There was an error processing your payment.');
      setDetailedError(error.details || null);
      toast({
        title: 'Payment Failed',
        description: error.message || 'There was an error processing your payment.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MainLayout title="Buy Credits" subtitle="Purchase credits to create more videos">
      <div className="section-container py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Choose a Credit Package</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Credits are used to generate videos. Each video generation costs 1 credit.
            Purchase the package that best suits your needs.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <CreditPackage
              key={pkg.id}
              title={pkg.title}
              credits={pkg.credits}
              price={pkg.price}
              description={pkg.description}
              icon={pkg.icon}
              onSelect={() => handleSelectPackage(pkg.id)}
            />
          ))}
        </div>
        
        <PaymentForm
          selectedPackage={selectedPackage}
          packageTitle={CREDIT_PACKAGES.find(pkg => pkg.id === selectedPackage)?.title}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          onCancel={() => setSelectedPackage(null)}
          onPurchase={handlePurchase}
          isProcessing={isProcessing}
          error={error}
          detailedError={detailedError}
        />
      </div>
    </MainLayout>
  );
};

export default BuyCreditsPage;
