import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useScriptPolling = (
  user: User | null,
  isLoading: boolean,
  onScriptGenerated: (script: string) => void,
  scriptOption: string,
  setIsLoading: (loading: boolean) => void,
  onScriptLoaded?: () => void
) => {
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const checkPreviewStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preview, script, preview_script')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Check if preview has finished generating
      if (data.preview === 'completed') {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }

        setIsLoading(false);
        
        // Use the appropriate script based on the script option
        const generatedScript = scriptOption === 'ai_find' 
          ? data.preview_script 
          : data.script;
          
        if (generatedScript) {
          onScriptGenerated(generatedScript);
          // Call onScriptLoaded to notify that the script has been loaded
          if (onScriptLoaded) {
            onScriptLoaded();
          }
        }
        
        toast({
          title: "Script generated",
          description: "Your script has been generated successfully."
        });
      }
      // Check if preview generation has failed
      else if (data.preview === 'failed') {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
        
        setIsLoading(false);
        
        toast({
          title: "Script generation failed",
          description: "There was an error generating your script. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking preview status:', error);
      
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      
      setIsLoading(false);
      
      toast({
        title: "Error",
        description: "Failed to check script generation status. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, setIsLoading, onScriptGenerated, scriptOption, toast, onScriptLoaded]);

  return { checkPreviewStatus, pollingInterval };
};
