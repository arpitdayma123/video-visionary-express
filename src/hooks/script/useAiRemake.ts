
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
  // Update webhook URL to use N8N endpoint
  const SCRIPT_REMAKE_WEBHOOK = "https://n8n.latestfreegames.online/webhook/scriptfind";
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // 1 second

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
  }, [user]);

  function handleScriptGenerated(newScript: string) {
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

  // Enhanced with retry logic and better error handling
  const fetchWithRetry = async (url: string, options: RequestInit, retriesLeft = MAX_RETRIES) => {
    try {
      console.log(`Attempting to fetch: ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Webhook response not OK (${response.status}):`, errorText);
        
        // If we have retries left and it's a 5xx error (server error)
        if (retriesLeft > 0 && (response.status >= 500 || response.status === 429)) {
          console.log(`Retrying webhook call. Retries left: ${retriesLeft}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchWithRetry(url, options, retriesLeft - 1);
        }
        
        throw new Error(`Webhook failed with status ${response.status}: ${errorText}`);
      }
      
      console.log('Webhook call successful');
      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('NetworkError') && retriesLeft > 0) {
        console.log(`Network error, retrying. Retries left: ${retriesLeft}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options, retriesLeft - 1);
      }
      throw error;
    }
  };

  const handleRegenerateScript = async () => {
    if (!user) return;
    
    try {
      if (script) {
        await saveFinalScript(user, script);
        await saveCustomScript(user, script);
      }
    } catch (error) {
      console.error('Error saving script before regeneration:', error);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preview: 'generating'
        })
        .eq('id', user.id);

      if (error) throw error;

      console.log('Calling webhook for AI remake regeneration...');
      // Use the existing N8N webhook URL with enhanced fetch
      const webhookUrl = `${SCRIPT_REMAKE_WEBHOOK}?userId=${user.id}&scriptOption=ai_remake&regenerate=true`;
      console.log('Webhook URL:', webhookUrl);
      
      const webhookResponse = await fetchWithRetry(
        webhookUrl,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Origin': window.location.origin
          },
          credentials: 'omit' // Don't send cookies for CORS
        }
      );

      // Process the response
      try {
        const responseData = await webhookResponse.json();
        console.log('Webhook response:', responseData);
        
        if (responseData.error) {
          throw new Error(responseData.error);
        }
      } catch (error) {
        console.log('Webhook response is not JSON or has no data, continuing with polling');
      }

      // Start polling regardless of webhook response format
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;

    } catch (error) {
      console.error('Error regenerating script:', error);
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
