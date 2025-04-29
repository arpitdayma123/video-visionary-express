
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { useScriptUtils } from './useScriptUtils';
import { useScriptPolling } from './useScriptPolling';
import { useScriptWebhook } from './useScriptWebhook';

export const useAiRemake = (
  user: User | null,
  onScriptGenerated: (script: string) => void
) => {
  // Update webhook URL to use N8N endpoint
  const SCRIPT_REMAKE_WEBHOOK = "https://n8n.latestfreegames.online/webhook/scriptfind";

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
  
  const { callWebhook } = useScriptWebhook();

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

      // Use the webhook URL with improved error handling
      console.log(`Calling webhook for ai_remake regeneration: ${SCRIPT_REMAKE_WEBHOOK}?userId=${user.id}&scriptOption=ai_remake&regenerate=true`);
      
      try {
        await callWebhook(`${SCRIPT_REMAKE_WEBHOOK}?userId=${user.id}&scriptOption=ai_remake&regenerate=true`);
        
        console.log('Webhook response received, starting polling');
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
  
        const interval = setInterval(checkPreviewStatus, 2000);
        pollingInterval.current = interval;
      } catch (error) {
        console.error('Error calling webhook:', error);
        // Continue with polling even if webhook fails
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
        const interval = setInterval(checkPreviewStatus, 2000);
        pollingInterval.current = interval;
      }
    } catch (error) {
      console.error('Error regenerating script:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to regenerate script. Please try again.",
        variant: "destructive"
      });
      
      // Try to continue with polling even if webhook fails
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
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
