
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkPreviewStatus = async () => {
    if (!user || !isMounted.current) return;
    
    try {
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
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  return { checkPreviewStatus, pollingInterval };
};
