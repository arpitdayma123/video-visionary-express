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
  const [pollingCount, setPollingCount] = useState(0);
  const maxPollingAttempts = 60; // 2 minutes of polling (at 2-second intervals)
  const [waitTimeExpired, setWaitTimeExpired] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  
  // Keep track of whether we're waiting for the initial response
  const waitingForInitialResponse = useRef(false);

  const checkPreviewStatus = async () => {
    if (!user || !isMounted.current) return;
    
    try {
      console.log(`[useScriptPolling] Checking preview status (attempt ${pollingCount + 1}/${maxPollingAttempts})`);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preview, previewscript')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[useScriptPolling] Error fetching profile:', error);
        return;
      }

      // Check if script generation is complete
      if (profile.preview === 'generated' && profile.previewscript) {
        console.log('[useScriptPolling] Script generation complete, clearing interval');
        
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          
          // Invalidate the freepoint query to trigger a refresh
          queryClient.invalidateQueries({ queryKey: ['freepoint', user.id] });
          
          toast({
            title: "Script Preview Ready",
            description: "Your script preview has been generated.",
          });
          
          // Reset polling count
          setPollingCount(0);
          
          // Reset waiting flags
          waitingForInitialResponse.current = false;
          setWaitTimeExpired(false);
        }
        
        if (isMounted.current) {
          setIsLoading(false);
          onScriptGenerated(profile.previewscript);
        }
        
        setGenerationStartTime(null);
      } 
      // Check for 'generating' status
      else if (profile.preview === 'generating') {
        // If we've exceeded max polling attempts, show a warning but continue polling
        if (pollingCount >= maxPollingAttempts) {
          console.log('[useScriptPolling] Max polling attempts reached, but continuing');
          setWaitTimeExpired(true);
          
          // Show a toast notification that generation is taking longer than expected
          toast({
            title: "Script Generation Taking Longer",
            description: "Script generation is taking longer than expected. Please continue waiting.",
            variant: "default"
          });
          
          // Reset polling count to prevent repeated notifications, but keep polling
          setPollingCount(0);
        } else {
          setPollingCount(prevCount => prevCount + 1);
        }
      }
      // Check for error status
      else if (profile.preview === 'error') {
        console.error('[useScriptPolling] Script generation error detected');
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        
        if (isMounted.current) {
          setIsLoading(false);
        }
        
        toast({
          title: "Script Generation Failed",
          description: "There was an error generating your script. Please try again.",
          variant: "destructive"
        });
        
        setPollingCount(0);
        waitingForInitialResponse.current = false;
        setWaitTimeExpired(false);
        setGenerationStartTime(null);
      }
    } catch (error) {
      console.error('[useScriptPolling] Error checking preview status:', error);
      
      // Don't stop polling on a single error, only if we've reached the maximum attempts
      if (pollingCount >= maxPollingAttempts) {
        if (pollingInterval.current && isMounted.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          setIsLoading(false);
          
          toast({
            title: "Error",
            description: "Failed to check preview status. Please try again.",
            variant: "destructive"
          });
        }
        
        setPollingCount(0);
        waitingForInitialResponse.current = false;
        setWaitTimeExpired(false);
        setGenerationStartTime(null);
      } else {
        setPollingCount(prevCount => prevCount + 1);
      }
    }
  };

  const startPolling = () => {
    console.log('[useScriptPolling] Starting polling');
    // Clear any existing polling
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    // Record the generation start time
    setGenerationStartTime(Date.now());
    
    // Reset states
    setPollingCount(0);
    waitingForInitialResponse.current = true;
    setWaitTimeExpired(false);
    
    // Start polling
    const interval = setInterval(checkPreviewStatus, 2000);
    pollingInterval.current = interval;
    
    return interval;
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      console.log('[useScriptPolling] Cleaning up polling');
      isMounted.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, []);

  return { 
    checkPreviewStatus, 
    startPolling, 
    pollingInterval, 
    waitTimeExpired, 
    generationStartTime
  };
};
