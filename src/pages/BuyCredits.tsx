
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Star, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define interfaces for better type safety
interface PackageOption {
  id: string;
  title: string;
  credits: number;
  price: string;
  priceValue: number;
  description: string;
  icon: React.ReactNode;
}

interface ProfileData {
  email: string | null;
  credit: number;
}

interface PaymentOrder {
  status: string;
  credits: number;
}

const CreditPackage = ({ 
  title, 
  credits, 
  price, 
  description, 
  icon, 
  onSelect 
}: { 
  title: string;
  credits: number;
  price: string;
  description: string;
  icon: React.ReactNode;
  onSelect: () => void;
}) => (
  <Card className="flex flex-col hover:shadow-lg transition-shadow">
    <CardHeader>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
        {icon}
      </div>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="flex-grow">
      <div className="text-3xl font-bold mb-2">{price}</div>
      <div className="text-muted-foreground">
        Get {credits} credits to create videos
      </div>
    </CardContent>
    <CardFooter>
      <Button className="w-full" onClick={onSelect}>
        Select Package
      </Button>
    </CardFooter>
  </Card>
);

const BuyCredits = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const packages: PackageOption[] = [
    {
      id: 'basic',
      title: 'Basic',
      credits: 5,
      price: '₹499',
      priceValue: 499,
      description: 'Perfect for beginners',
      icon: <CreditCard className="text-primary" />,
    },
    {
      id: 'standard',
      title: 'Standard',
      credits: 20,
      price: '₹1,499',
      priceValue: 1499,
      description: 'Most popular choice',
      icon: <Star className="text-primary" />,
    },
    {
      id: 'premium',
      title: 'Premium',
      credits: 50,
      price: '₹2,999',
      priceValue: 2999,
      description: 'Best value for pros',
      icon: <Zap className="text-primary" />,
    },
  ];

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId);
    setError(null);
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
    
    try {
      const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);
      if (!selectedPkg) return;
      
      // Get user profile to get email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, credit')
        .eq('id', user.id)
        .single() as { data: ProfileData | null; error: any };
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('Could not retrieve user profile');
      }

      // Generate unique order ID
      const orderId = `order_${uuidv4().replace(/-/g, '')}`;
      const returnUrl = `${window.location.origin}/buy-credits`;
      
      // Call Cashfree payment function with phone number
      const response = await supabase.functions.invoke('cashfree-payment', {
        body: {
          orderId,
          orderAmount: selectedPkg.priceValue,
          orderCurrency: 'INR',
          userId: user.id,
          credits: selectedPkg.credits,
          customerEmail: profileData?.email || user.email,
          customerName: user.user_metadata?.full_name || '',
          customerPhone: phoneNumber.trim(),
          returnUrl
        }
      });

      if (response.error) {
        console.error('Payment error:', response.error);
        throw new Error(response.error.message || 'Payment initialization failed');
      }

      if (response.data?.payment_link) {
        // Redirect to payment page
        window.location.href = response.data.payment_link;
      } else {
        throw new Error('No payment link received');
      }
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      setError(error.message || 'There was an error processing your payment.');
      toast({
        title: 'Payment Failed',
        description: error.message || 'There was an error processing your payment.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle payment return from Cashfree
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    
    if (orderId) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Check payment status
      const checkPaymentStatus = async () => {
        try {
          const { data, error } = await supabase
            .from('payment_orders')
            .select('status, credits')
            .eq('order_id', orderId)
            .single() as { data: PaymentOrder | null; error: any };
          
          if (error) {
            toast({
              title: 'Error',
              description: 'Could not verify payment status. Please contact support.',
              variant: 'destructive',
            });
            return;
          }

          if (data && data.status === 'PAID') {
            toast({
              title: 'Payment Successful',
              description: `${data.credits} credits have been added to your account.`,
            });
          } else if (data && data.status === 'FAILED') {
            toast({
              title: 'Payment Failed',
              description: 'Your payment was unsuccessful. Please try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Payment Processing',
              description: 'Your payment is being processed. Credits will be added soon.',
            });
          }
        } catch (err) {
          console.error('Error checking payment status:', err);
        }
      };

      checkPaymentStatus();
    }
  }, [toast]);

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
          {packages.map((pkg) => (
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
        
        {selectedPackage && (
          <div className="mt-10 flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-4">
              Complete Your Purchase
            </h3>
            <p className="text-muted-foreground mb-4">
              You selected the {packages.find(pkg => pkg.id === selectedPackage)?.title} package.
            </p>
            
            {error && (
              <Alert variant="destructive" className="mb-6 max-w-md w-full">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="w-full max-w-md mb-6">
              <Label htmlFor="phone" className="mb-2 block">Phone Number (Required)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mb-4"
              />
              <p className="text-xs text-muted-foreground mb-4">
                Your phone number is required by our payment processor for verification purposes.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <Button variant="outline" onClick={() => setSelectedPackage(null)}>
                Cancel
              </Button>
              <Button onClick={handlePurchase} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BuyCredits;
