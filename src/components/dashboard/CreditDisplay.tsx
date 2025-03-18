
import React, { useEffect, useState, useRef } from 'react';
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
  const { toast } = useToast();
  const intervalRef = useRef<number | null>(null);
  
  // Poll for credit updates when returning from payment
  useEffect(() => {
    setCredits(userCredits);
    
    // Clear any existing interval when component remounts
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Check for fresh credits more frequently (every 3 seconds for 30 seconds)
    // This helps update UI faster after payment completion
    if (user) {
      const checkCount = 10; // 10 checks * 3 seconds = 30 seconds
      let currentCheck = 0;
      
      const checkCredits = async () => {
        if (currentCheck >= checkCount) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('credit')
            .eq('id', user.id)
            .maybeSingle();
          
          if (!error && data && data.credit !== credits) {
            setCredits(data.credit);
            toast({
              title: 'Credits Updated',
              description: `Your credit balance is now ${data.credit}`,
            });
            console.log(`Credits updated from ${credits} to ${data.credit}`);
          }
          
          currentCheck++;
        } catch (error) {
          console.error('Error checking credits:', error);
        }
      };
      
      // Initial check
      checkCredits();
      
      // Start interval
      intervalRef.current = window.setInterval(checkCredits, 3000); // Check every 3 seconds
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [user, userCredits, toast, credits]);
  
  return (
    <div className="flex items-center gap-4">
      <div className="bg-secondary/40 px-4 py-2 rounded-lg">
        <span className="text-sm mr-2">Credits:</span>
        <span className="font-medium">{credits}</span>
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
