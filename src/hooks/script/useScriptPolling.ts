
import { useEnhancedPolling } from './useEnhancedPolling';
import { User } from '@supabase/supabase-js';
import { useRef } from 'react';

export const useScriptPolling = (
  user: User | null,
  isLoading: boolean,
  onScriptGenerated: (script: string) => void,
  scriptOption: string,
  setIsLoading: (value: boolean) => void
) => {
  // Get all the actual functions and state from useEnhancedPolling
  const { isPolling, pollCount, stopPolling, checkPreviewStatus, pollingInterval } = useEnhancedPolling(user, isLoading, {
    onSuccess: (script: string) => {
      setIsLoading(false);
      onScriptGenerated(script);
    },
    onError: (error: string) => {
      setIsLoading(false);
      console.error('Script generation error:', error);
    }
  });

  // Return the actual functions and state for use in the parent component
  return { 
    isPolling, 
    pollCount, 
    stopPolling,
    checkPreviewStatus,
    pollingInterval
  };
};
