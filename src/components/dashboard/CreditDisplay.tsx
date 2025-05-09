
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CreditDisplayProps {
  userCredits: number;
  userStatus: string;
}

const CreditDisplay = ({ userCredits, userStatus }: CreditDisplayProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [credits, setCredits] = useState(userCredits);
  const [isPolling, setIsPolling] = useState(false);
  const { toast } = useToast();
  
  // Poll for credit updates when returning from payment
  useEffect(() => {
    setCredits(userCredits);
    
    // Check for payment status in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hasPaymentParams = urlParams.has('order_id') || urlParams.has('payment_id');
    
    // If returning from payment page or credits changed
    if (user && (hasPaymentParams || userCredits !== credits)) {
      setIsPolling(true);
      
      // Check for fresh credits more frequently (every 2 seconds for 30 seconds)
      // This helps update UI faster after payment completion
      const checkCount = 15; // 15 checks * 2 seconds = 30 seconds
      let currentCheck = 0;
      
      const checkInterval = setInterval(async () => {
        if (currentCheck >= checkCount) {
          clearInterval(checkInterval);
          setIsPolling(false);
          return;
        }
        
        try {
          console.log(`Checking credits update (${currentCheck + 1}/${checkCount})...`);
          const { data, error } = await supabase
            .from('profiles')
            .select('credit')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error checking credits:', error);
          } else if (data && data.credit !== credits) {
            setCredits(data.credit);
            toast({
              title: 'Credits Updated',
              description: `Your credit balance is now ${data.credit}`,
            });
            console.log(`Credits updated from ${credits} to ${data.credit}`);
            clearInterval(checkInterval);
            setIsPolling(false);
          }
          
          currentCheck++;
        } catch (error) {
          console.error('Error checking credits:', error);
        }
      }, 2000); // Check every 2 seconds
      
      return () => {
        clearInterval(checkInterval);
        setIsPolling(false);
      };
    }
  }, [user, userCredits, toast, credits]);
  
  return (
    <div className="flex items-center gap-4">
      <div className="bg-secondary/40 px-4 py-2 rounded-lg">
        <span className="text-sm mr-2">Credits:</span>
        <span className="font-medium">{credits}</span>
        {isPolling && (
          <span className="ml-2 text-xs text-muted-foreground animate-pulse">
            updating...
          </span>
        )}
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-1"
        onClick={() => navigate('/buy-credits')}
      >
        <CreditCard className="h-4 w-4" />
        Buy Credits
      </Button>
      
      {userStatus === 'Processing' && (
        <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200 px-4 py-2 rounded-lg font-medium">
          <span className="text-sm">Processing video...</span>
        </div>
      )}
    </div>
  );
};

export default CreditDisplay;
