
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface PollingConfig {
  baseInterval?: number;
  maxAttempts?: number;
  onSuccess: (script: string) => void;
  onError?: (error: string) => void;
}

export const useEnhancedPolling = (
  user: User | null,
  isActive: boolean,
  config: PollingConfig
) => {
  const [isPolling, setIsPolling] = useState(false);
  const pollCount = useRef(0);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const consecErrorCount = useRef(0);
  const maxConsecutiveErrors = 3;
  const isFirstRun = useRef(true);
  const isUnmounted = useRef(false);
  
  const baseInterval = config.baseInterval || 3000; // 3 seconds
  const maxAttempts = config.maxAttempts || 300; // 15 minutes worth of attempts

  // Cleanup function to ensure we don't have memory leaks
  const cleanupPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    cleanupPolling();
    setIsPolling(false);
    pollCount.current = 0;
    consecErrorCount.current = 0;
  }, [cleanupPolling]);

  const checkPreviewStatus = useCallback(async () => {
    if (!user || isUnmounted.current) {
      stopPolling();
      return;
    }

    try {
      console.log(`Polling attempt ${pollCount.current + 1} of ${maxAttempts}`);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preview, previewscript')
        .eq('id', user.id)
        .single();

      if (error) {
        consecErrorCount.current++;
        console.error(`Error fetching profile (attempt ${consecErrorCount.current}):`, error);
        
        if (consecErrorCount.current >= maxConsecutiveErrors) {
          stopPolling();
          config.onError?.("Failed to check preview status after multiple attempts");
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

      if (profile.preview === 'generated' && profile.previewscript) {
        stopPolling();
        config.onSuccess(profile.previewscript);
        toast({
          title: "Script Preview Ready",
          description: "Your script preview has been generated.",
        });
      } else if (profile.preview === 'error') {
        stopPolling();
        config.onError?.("Failed to generate script");
        toast({
          title: "Generation Failed",
          description: "There was an error generating your script. Please try again.",
          variant: "destructive"
        });
      } else if (pollCount.current >= maxAttempts) {
        stopPolling();
        
        // Update preview status to 'timeout'
        await supabase
          .from('profiles')
          .update({ preview: 'timeout' })
          .eq('id', user.id);
          
        config.onError?.("Generation timeout");
        toast({
          title: "Generation Timeout",
          description: "The script generation is taking longer than expected. Please try again.",
          variant: "destructive"
        });
      }
      
      // Adaptive polling: increase interval after certain thresholds
      if (pollCount.current > 20 && pollingInterval.current) {
        cleanupPolling();
        if (!isUnmounted.current) {
          pollingInterval.current = setInterval(checkPreviewStatus, 5000); // Every 5s after 20 attempts
        }
      } else if (pollCount.current > 60 && pollingInterval.current) {
        cleanupPolling();
        if (!isUnmounted.current) {
          pollingInterval.current = setInterval(checkPreviewStatus, 10000); // Every 10s after 60 attempts
        }
      }
      
    } catch (error) {
      console.error('Error in polling:', error);
      consecErrorCount.current++;
      
      if (consecErrorCount.current >= maxConsecutiveErrors) {
        stopPolling();
        config.onError?.("Failed to check preview status");
        toast({
          title: "Error",
          description: "Failed to check preview status. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [user, maxAttempts, stopPolling, toast, config, cleanupPolling]);

  // Start or stop polling based on isActive flag
  useEffect(() => {
    isUnmounted.current = false;
    
    if (isActive && user && !isPolling) {
      setIsPolling(true);
      pollCount.current = 0;
      consecErrorCount.current = 0;
      
      // Start polling immediately on first run
      if (isFirstRun.current) {
        isFirstRun.current = false;
        checkPreviewStatus();
      }
      
      // Set up interval for future polling
      cleanupPolling(); // Clean up any existing interval first
      pollingInterval.current = setInterval(checkPreviewStatus, baseInterval);
    } else if (!isActive && isPolling) {
      stopPolling();
    }

    return () => {
      isUnmounted.current = true;
      cleanupPolling();
    };
  }, [isActive, user, isPolling, checkPreviewStatus, cleanupPolling, stopPolling, baseInterval]);

  return {
    isPolling,
    pollCount: pollCount.current,
    stopPolling,
    checkPreviewStatus,
    pollingInterval
  };
};
