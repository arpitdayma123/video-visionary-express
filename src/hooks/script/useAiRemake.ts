
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { useScriptUtils } from './useScriptUtils';
import { useScriptPolling } from './useScriptPolling';

export const useAiRemake = (
  user: User | null,
  onScriptGenerated: (script: string) => void
) => {
  // Update the webhook URL to use the trendy-webhook Supabase edge function
  const SUPABASE_PROJECT_ID = "ljcziwpohceaacdreugx";
  const TRENDY_WEBHOOK = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/trendy-webhook`;
  const FETCH_TIMEOUT = 20000; // 20 seconds timeout for fetch requests

  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const { toast } = useToast();
  const { updateWordCount, saveFinalScript, saveCustomScript } = useScriptUtils();
  const { checkPreviewStatus, pollingInterval } = useScriptPolling(
    user,
    isLoading,
    handleScriptGenerated,
    'ai_remake',
    setIsLoading
  );

  // For aborting fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    const fetchExistingScript = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('custom_script')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching custom script:', error);
          return;
        }
        
        if (data && data.custom_script) {
          setScript(data.custom_script);
          setWordCount(updateWordCount(data.custom_script));
        }
      } catch (error) {
        console.error('Error in fetchExistingScript:', error);
      }
    };
    
    fetchExistingScript();
    
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, updateWordCount]);

  function handleScriptGenerated(newScript: string) {
    if (!newScript) {
      console.log('useAiRemake - Empty script received, not updating');
      return;
    }
    
    setScript(newScript);
    setWordCount(updateWordCount(newScript));
    saveFinalScript(user, newScript);
    saveCustomScript(user, newScript);
    onScriptGenerated(newScript);
  }

  const handleScriptChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newScript = e.target.value;
    setScript(newScript);
    setWordCount(updateWordCount(newScript));
    
    if (user) {
      await saveFinalScript(user, newScript);
      await saveCustomScript(user, newScript);
    }
  };

  const handleRegenerateScript = async () => {
    if (!user) return;
    
    // Prevent duplicate calls
    if (isGeneratingRef.current) {
      console.log('Script regeneration already in progress, preventing duplicate call');
      return;
    }
    
    // Set the generating flag
    isGeneratingRef.current = true;
    
    try {
      if (script) {
        await saveFinalScript(user, script);
        await saveCustomScript(user, script);
      }
    } catch (error) {
      console.error('Error saving script before regeneration:', error);
      // Don't block regeneration but notify user
      toast({
        title: "Warning",
        description: "Failed to save the current script before regenerating, but continuing anyway.",
        variant: "default"
      });
    }
    
    setIsLoading(true);
    
    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Set a timeout to abort the fetch if it takes too long
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current === abortController) {
        console.log('Fetch timeout reached, aborting request');
        abortController.abort();
      }
    }, FETCH_TIMEOUT);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preview: 'generating'
        })
        .eq('id', user.id);

      if (error) throw error;

      // Use the trendy-webhook endpoint
      const webhookUrl = `${TRENDY_WEBHOOK}?userId=${user.id}&scriptOption=ai_remake&regenerate=true`;
      console.log('Calling webhook for ai_remake:', webhookUrl);
      
      const webhookResponse = await fetch(
        webhookUrl,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          signal: abortController.signal
        }
      ).catch(err => {
        if (err.name === 'AbortError') {
          console.log('Fetch request was aborted due to timeout');
          return null;
        }
        throw err;
      });

      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Handle aborted request or timeout
      if (!webhookResponse) {
        console.log('No webhook response (likely due to timeout), continuing with polling anyway');
      } else {
        let responseJson: any = null;
        try {
          responseJson = await webhookResponse.clone().json();
        } catch (error) {
          console.error('Failed to parse webhook response:', error);
        }

        if (responseJson && responseJson.error) {
          isGeneratingRef.current = false;
          setIsLoading(false);
          toast({
            title: "Script regeneration error",
            description: responseJson.error,
            variant: "destructive"
          });
          return;
        }
      }

      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
    } catch (error) {
      console.error('Error regenerating script:', error);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Reset the generating flag
      isGeneratingRef.current = false;
      
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to regenerate script. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    isLoading,
    script,
    wordCount,
    handleScriptChange,
    handleRegenerateScript
  };
};
