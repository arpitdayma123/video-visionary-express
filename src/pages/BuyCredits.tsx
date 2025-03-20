
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Star, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

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

interface CashfreeErrorResponse {
  error: string;
  details?: any;
  response?: any;
}

const BuyCredits = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const packages: PackageOption[] = [
    {
      id: 'basic',
      title: 'Basic',
      credits: 5,
      price: '₹499',
      priceValue: 499,
      description: 'Perfect for beginners',
      icon: <CreditCard className="h-8 w-8 text-primary" />,
    },
    {
      id: 'standard',
      title: 'Standard',
      credits: 20,
      price: '₹1,499',
      priceValue: 1499,
      description: 'Most popular choice',
      icon: <Star className="h-8 w-8 text-primary" />,
    },
    {
      id: 'premium',
      title: 'Premium',
      credits: 50,
      price: '₹2,999',
      priceValue: 2999,
      description: 'Best value for pros',
      icon: <Zap className="h-8 w-8 text-primary" />,
    },
  ];

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId);
    setError(null);
    setDetailedError(null);
    setShowDialog(true);
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
      
      // Use dashboard as the return URL
      const returnUrl = `${window.location.origin}/dashboard`;
      
      console.log('Calling cashfree-payment function with:', {
        orderAmount: selectedPkg.priceValue,
        customerPhone: phoneNumber.trim(),
      });
      
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

      console.log("Payment function response:", response);

      if (response.error) {
        console.error('Payment error:', response.error);
        throw new Error(response.error.message || 'Payment initialization failed');
      }

      if (response.data?.payment_link) {
        // Redirect to payment page
        window.location.href = response.data.payment_link;
      } else {
        // Log the entire response for debugging
        console.error('No payment link in response:', response);
        
        // Display detailed error information
        if (response.data?.error) {
          const errorData = response.data as CashfreeErrorResponse;
          setDetailedError(errorData);
          throw new Error(errorData.error || 'No payment link received');
        } else {
          throw new Error('No payment link received');
        }
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
  useEffect(() => {
    // If user was redirected after payment, there might be order_id in the URL
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
      <div className="section-container py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Choose a Credit Package</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Credits are used to generate videos. Each video generation costs 1 credit.
            Select a package that best suits your needs.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id}
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg group ${
                pkg.id === 'standard' ? 'border-primary border-2' : 'border-border'
              }`}
              onClick={() => handleSelectPackage(pkg.id)}
            >
              {pkg.id === 'standard' && (
                <div className="absolute top-0 right-0 bg-primary px-3 py-1 text-xs text-primary-foreground rounded-bl-md">
                  Popular
                </div>
              )}
              
              <div className="p-6 flex flex-col h-full">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    {pkg.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{pkg.title}</h3>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold">{pkg.price}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    For {pkg.credits} credits
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-6">{pkg.description}</p>
                
                <Button 
                  variant={pkg.id === 'standard' ? 'default' : 'outline'} 
                  size="lg"
                  className="mt-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPackage(pkg.id);
                  }}
                >
                  Select Package
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Phone Number Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>
              {selectedPackage && (
                <>You selected the {packages.find(pkg => pkg.id === selectedPackage)?.title} package.</>
              )}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-wrap">
                {error}
                {detailedError && (
                  <>
                    <br /><br />
                    <strong>Details:</strong> 
                    <pre className="mt-2 text-xs overflow-x-auto">
                      {JSON.stringify(detailedError, null, 2)}
                    </pre>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="py-4">
            <Label htmlFor="phone-dialog" className="mb-2 block">Phone Number (Required)</Label>
            <Input
              id="phone-dialog"
              type="tel"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Your phone number is required by our payment processor for verification.
            </p>
          </div>

          <DialogFooter className="flex justify-end gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePurchase} 
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Proceed to Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default BuyCredits;
