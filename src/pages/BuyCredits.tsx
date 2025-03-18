
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Star, Zap } from 'lucide-react';

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
  const { toast } = useToast();
  const { user } = useAuth();

  const packages = [
    {
      id: 'basic',
      title: 'Basic',
      credits: 5,
      price: '$9.99',
      description: 'Perfect for beginners',
      icon: <CreditCard className="text-primary" />,
    },
    {
      id: 'standard',
      title: 'Standard',
      credits: 20,
      price: '$29.99',
      description: 'Most popular choice',
      icon: <Star className="text-primary" />,
    },
    {
      id: 'premium',
      title: 'Premium',
      credits: 50,
      price: '$59.99',
      description: 'Best value for pros',
      icon: <Zap className="text-primary" />,
    },
  ];

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId);
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !user) return;
    
    setIsProcessing(true);
    try {
      const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);
      if (!selectedPkg) return;
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add credits to user's account
      const { data, error } = await supabase
        .from('profiles')
        .select('credit')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      const currentCredits = data?.credit || 0;
      const newCredits = currentCredits + selectedPkg.credits;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credit: newCredits })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: 'Purchase Successful',
        description: `Added ${selectedPkg.credits} credits to your account.`,
      });
      
      setSelectedPackage(null);
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: 'There was an error processing your purchase.',
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
            <div className="flex space-x-4">
              <Button variant="outline" onClick={() => setSelectedPackage(null)}>
                Cancel
              </Button>
              <Button onClick={handlePurchase} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Complete Purchase'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BuyCredits;
