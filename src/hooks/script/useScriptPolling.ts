
import { useEffect, useRef } from 'react';
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
  const pollCount = useRef(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const maxAttempts = 300; // 15 minutes (3s * 300) - increased from 10 minutes
  const baseDelay = 3000; // Start with 3 second delay - increased from 2 seconds
  const consecErrorCount = useRef(0);
  const maxConsecutiveErrors = 3;

  const checkPreviewStatus = async () => {
    if (!user || !isMounted.current) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preview, previewscript')
        .eq('id', user.id)
        .single();

      if (error) {
        consecErrorCount.current++;
        console.error(`Error fetching profile (attempt ${consecErrorCount.current}):`, error);
        
        // Only stop polling if we've had multiple consecutive errors
        if (consecErrorCount.current >= maxConsecutiveErrors) {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
          setIsLoading(false);
          
          toast({
            title: "Error",
            description: "Failed to check preview status after multiple attempts. Please try again.",
            variant: "destructive"
          });
        }
        return;
      }

      // Reset consecutive error count on success
      consecErrorCount.current = 0;
      
      pollCount.current++;
      console.log(`Polling attempt ${pollCount.current} of ${maxAttempts}`);

      // If preview is 'generated' and we have a script
      if (profile.preview === 'generated' && profile.previewscript) {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          
          // Invalidate the freepoint query to trigger a refresh
          queryClient.invalidateQueries({ queryKey: ['freepoint', user.id] });
          
          toast({
            title: "Script Preview Ready",
            description: "Your script preview has been generated.",
          });
        }
        
        if (isMounted.current) {
          setIsLoading(false);
          pollCount.current = 0;
          onScriptGenerated(profile.previewscript);
        }
      }
      // If preview is 'error', show error message
      else if (profile.preview === 'error') {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        
        setIsLoading(false);
        pollCount.current = 0;
        
        toast({
          title: "Generation Failed",
          description: "There was an error generating your script. Please try again.",
          variant: "destructive"
        });
      }
      // If we've exceeded our maximum attempts
      else if (pollCount.current >= maxAttempts) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
        setIsLoading(false);
        pollCount.current = 0;
        
        // Update preview status to 'timeout'
        if (user) {
          await supabase
            .from('profiles')
            .update({ preview: 'timeout' })
            .eq('id', user.id);
        }
        
        toast({
          title: "Generation Timeout",
          description: "The script generation is taking longer than expected. The process may still be running in the background - check back later or try again.",
          variant: "destructive"
        });
      }
      // Special case for if profile contains a custom timeout message
      else if (profile.previewscript && profile.previewscript.startsWith('TIMEOUT:')) {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        
        setIsLoading(false);
        pollCount.current = 0;
        
        const errorMessage = profile.previewscript.replace('TIMEOUT:', '').trim();
        
        toast({
          title: "Process Timed Out",
          description: errorMessage || "The script generation timed out. Please try again.",
          variant: "destructive"
        });
      }
      
      // Adaptive polling: if we've been polling for a while, slow down the frequency
      if (pollCount.current > 20 && pollingInterval.current) {
        clearInterval(pollingInterval.current);
        const newInterval = setInterval(checkPreviewStatus, 5000); // Every 5 seconds after 20 attempts
        pollingInterval.current = newInterval;
      }
      else if (pollCount.current > 60 && pollingInterval.current) {
        clearInterval(pollingInterval.current);
        const newInterval = setInterval(checkPreviewStatus, 10000); // Every 10 seconds after 60 attempts
        pollingInterval.current = newInterval;
      }
      
    } catch (error) {
      console.error('Error checking preview status:', error);
      consecErrorCount.current++;
      
      // Only stop polling if we've had multiple consecutive errors
      if (consecErrorCount.current >= maxConsecutiveErrors && pollingInterval.current && isMounted.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
        setIsLoading(false);
        pollCount.current = 0;
        
        toast({
          title: "Error",
          description: "Failed to check preview status. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollCount.current = 0;
      }
    };
  }, []);

  return { checkPreviewStatus, pollingInterval };
};
