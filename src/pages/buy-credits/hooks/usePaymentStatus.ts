
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { checkPaymentStatus } from '../utils/payment';

const usePaymentStatus = () => {
  const { toast } = useToast();

  useEffect(() => {
    // If user was redirected after payment, there might be order_id in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    
    if (orderId) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const verifyPayment = async () => {
        const result = await checkPaymentStatus(orderId);
        
        toast({
          title: result.success ? 
            (result.status === 'PAID' ? 'Payment Successful' : 'Payment Processing') : 
            'Payment Failed',
          description: result.message,
          variant: result.success ? 'default' : 'destructive',
        });
      };

      verifyPayment();
    }
  }, [toast]);
};

export default usePaymentStatus;
