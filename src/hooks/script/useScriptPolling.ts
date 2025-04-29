import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

export const useScriptPolling = (
  user: User | null,
  isLoading: boolean,
  onScriptGenerated: (script: string) => void,
  scriptOption: string,
  setIsLoading: (value: boolean) => void
) => {
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const MAX_POLLING_ATTEMPTS = 45; // 90 seconds with 2-second interval
  const RETRY_DELAY = 3000; // 3 seconds delay for retries

  const checkPreviewStatus = async () => {
    if (!user || !isMounted.current) return;
    
    try {
      setPollingAttempts(prev => prev + 1);
      
      // Timeout after MAX_POLLING_ATTEMPTS
      if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
        console.log('Polling timeout reached:', pollingAttempts);
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          
          // Keep UI in loading state but try one more time after a delay
          setTimeout(() => {
            console.log('Retrying after timeout...');
            // Reset attempts and start polling again with a new interval
            setPollingAttempts(0);
            const interval = setInterval(checkPreviewStatus, 2000);
            pollingInterval.current = interval;
          }, RETRY_DELAY);
          
          // Show toast to inform user
          toast({
            title: "Still Generating...",
            description: "Your script is still being generated. This may take a bit longer than usual.",
          });
          
          return;
        }
      }
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preview, previewscript')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (profile.preview === 'generated' && profile.previewscript) {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          
          // Reset polling attempts
          setPollingAttempts(0);
          
          // Invalidate the freepoint query to trigger a refresh
          queryClient.invalidateQueries({ queryKey: ['freepoint', user.id] });
          
          toast({
            title: "Script Preview Ready",
            description: "Your script preview has been generated.",
          });
        }
        
        if (isMounted.current) {
          setIsLoading(false);
          onScriptGenerated(profile.previewscript);
        }
      }
    } catch (error) {
      console.error('Error checking preview status:', error);
      
      // Instead of stopping polling immediately, retry after a delay
      if (pollingInterval.current && isMounted.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
        
        // Only stop and show error if we've attempted multiple retries
        if (pollingAttempts >= 3) {
          setIsLoading(false);
          setPollingAttempts(0);
          
          toast({
            title: "Error",
            description: "Failed to check preview status. Please try again.",
            variant: "destructive"
          });
        } else {
          // Retry the polling after a short delay
          setTimeout(() => {
            console.log('Retrying polling after error...');
            const interval = setInterval(checkPreviewStatus, 2000);
            pollingInterval.current = interval;
          }, RETRY_DELAY);
        }
      }
    }
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  return { checkPreviewStatus, pollingInterval, pollingAttempts, setPollingAttempts };
};
