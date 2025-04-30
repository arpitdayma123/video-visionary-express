
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { useScriptUtils } from './useScriptUtils';
import { useScriptPolling } from './useScriptPolling';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

export const useAiRemake = (
  user: User | null,
  onScriptGenerated: (script: string) => void
) => {
  // Update webhook URL to use N8N endpoint
  const SCRIPT_REMAKE_WEBHOOK = "https://n8n.latestfreegames.online/webhook/scriptfind";

  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);
  
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
  }, [user, updateWordCount]);

  function handleScriptGenerated(newScript: string) {
    if (!newScript) {
      console.log('useAiRemake - Empty script received, not updating');
      return;
    }
    
    setWebhookError(null);
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
    if (!user || fetchInProgressRef.current) return;
    
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
    fetchInProgressRef.current = true;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preview: 'generating'
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Regenerating Script",
        description: "This may take several minutes. Please be patient.",
      });

      // Use our new fetchWithTimeout utility
      const webhookResponse = await fetchWithTimeout(
        `${SCRIPT_REMAKE_WEBHOOK}?userId=${user.id}&scriptOption=ai_remake&regenerate=true`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          timeout: 300000, // 5 minutes
          retries: 2,
          retryDelay: 10000 // 10 seconds between retries
        }
      );

      if (!webhookResponse.ok) {
        throw new Error(`Webhook failed with status ${webhookResponse.status}`);
      }

      let responseJson = null;
      try {
        responseJson = await webhookResponse.json();
      } catch (error) {
        console.error('Failed to parse webhook response:', error);
      }

      // Clear webhook error on successful response
      setWebhookError(null);

      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;

    } catch (error) {
      console.error('Error regenerating script:', error);
      setIsLoading(false);
      fetchInProgressRef.current = false;
      setWebhookError(error instanceof Error ? error.message : "An error occurred");
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
    handleRegenerateScript,
    webhookError,
    setWebhookError
  };
};
