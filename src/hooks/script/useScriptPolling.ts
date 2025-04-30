
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
  const pollingCount = useRef(0);
  const MAX_POLLING_COUNT = 180; // 6 minutes with 2-second intervals
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkPreviewStatus = async () => {
    if (!user || !isMounted.current) return;
    
    try {
      // Increment polling count
      pollingCount.current++;
      
      // Check if we've exceeded the maximum polling limit
      if (pollingCount.current > MAX_POLLING_COUNT) {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        
        if (isMounted.current) {
          setIsLoading(false);
          toast({
            title: "Script Generation Timeout",
            description: "The script generation process is taking longer than expected. Please try again later.",
            variant: "destructive"
          });
        }
        return;
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
          pollingCount.current = 0;
          
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
      if (pollingInterval.current && isMounted.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
        pollingCount.current = 0;
        setIsLoading(false);
        
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
      pollingCount.current = 0;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  return { checkPreviewStatus, pollingInterval };
};
