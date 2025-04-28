
import { useEnhancedPolling } from './useEnhancedPolling';
import { User } from '@supabase/supabase-js';

export const useScriptPolling = (
  user: User | null,
  isLoading: boolean,
  onScriptGenerated: (script: string) => void,
  scriptOption: string,
  setIsLoading: (value: boolean) => void
) => {
  const { isPolling, pollCount, stopPolling } = useEnhancedPolling(user, isLoading, {
    onSuccess: (script: string) => {
      setIsLoading(false);
      onScriptGenerated(script);
    },
    onError: (error: string) => {
      setIsLoading(false);
      console.error('Script generation error:', error);
    }
  });

  return { checkPreviewStatus: () => {}, pollingInterval: { current: null } };
};
