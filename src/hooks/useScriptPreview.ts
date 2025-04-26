import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useScriptUtils } from './script/useScriptUtils';
import { useScriptPolling } from './script/useScriptPolling';
import { useAiRemake } from './script/useAiRemake';

export const useScriptPreview = (
  user: User | null, 
  onScriptGenerated: (script: string) => void,
  scriptOption: string
) => {
  // Update webhook URLs to N8N endpoints
  const SCRIPT_FIND_WEBHOOK = "https://n8n.latestfreegames.online/webhook/scriptfind";

  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const { toast } = useToast();
  const { updateWordCount, saveCustomScript, saveFinalScript } = useScriptUtils();
  const { checkPreviewStatus, pollingInterval } = useScriptPolling(
    user,
    isLoading,
    handleScriptGenerated,
    scriptOption,
    setIsLoading
  );

  // Use AI Remake hook if that option is selected
  const aiRemake = useAiRemake(user, onScriptGenerated);
  if (scriptOption === 'ai_remake') {
    // Pass webhookError through in ai_remake mode as well, if needed in future.
    return {
      ...aiRemake,
      isPreviewVisible,
      setIsPreviewVisible,
      webhookError,
      setWebhookError,
      handleGeneratePreview: aiRemake.handleRegenerateScript
    };
  }

  function handleScriptGenerated(newScript: string) {
    setWebhookError(null); // clear errors on successful script
    setScript(newScript);
    setWordCount(updateWordCount(newScript));
    setIsPreviewVisible(true);
    console.log('useScriptPreview - Script generated, setting preview visible to true');
    onScriptGenerated(newScript);
  }

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newScript = e.target.value;
    setScript(newScript);
    setWordCount(updateWordCount(newScript));
    if (user && scriptOption === 'ai_remake') {
      saveCustomScript(user, newScript);
    }
  };

  const handleGeneratePreview = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      const webhookResponse = await fetch(
        `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&regenerate=false`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      let responseJson: any = null;
      try {
        responseJson = await webhookResponse.clone().json();
      } catch { /* ignore */ }

      // If error in webhook payload, show error, stop, don't run polling.
      if (responseJson && responseJson.error) {
        setIsLoading(false);
        setWebhookError(responseJson.error);
        setIsPreviewVisible(false);
        toast({
          title: "Script generation error",
          description: responseJson.error,
          variant: "destructive"
        });
        return;
      } else {
        setWebhookError(null);
      }

      setIsPreviewVisible(true);
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
    } catch (error) {
      setIsLoading(false);
      setWebhookError("Failed to start preview generation. Please try again.");
      toast({
        title: "Error",
        description: "Failed to start preview generation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRegenerateScript = async () => {
    if (!user) return;
    if ((scriptOption === 'ai_find' || scriptOption === 'ig_reel') && script) {
      try {
        await saveFinalScript(user, script);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save the current script before regenerating.",
          variant: "destructive"
        });
      }
    }
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      const webhookResponse = await fetch(
        `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&regenerate=true`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      let responseJson: any = null;
      try {
        responseJson = await webhookResponse.clone().json();
      } catch { /* ignore */ }

      if (responseJson && responseJson.error) {
        setIsLoading(false);
        setWebhookError(responseJson.error);
        setIsPreviewVisible(false);
        toast({
          title: "Script regeneration error",
          description: responseJson.error,
          variant: "destructive"
        });
        return;
      } else {
        setWebhookError(null);
      }

      setIsPreviewVisible(true);

      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
    } catch (error) {
      setIsLoading(false);
      setWebhookError("Failed to regenerate script. Please try again.");
      toast({
        title: "Error",
        description: "Failed to regenerate script. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleChangeScript = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      const webhookResponse = await fetch(
        `https://n8n.latestfreegames.online/webhook/scriptfind?userId=${user.id}&changescript=true`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      let responseJson: any = null;
      try {
        responseJson = await webhookResponse.clone().json();
      } catch { /* ignore */ }
      
      if (responseJson && responseJson.error) {
        setIsLoading(false);
        setWebhookError(responseJson.error);
        setIsPreviewVisible(false);
        toast({
          title: "Change script error",
          description: responseJson.error,
          variant: "destructive"
        });
        return;
      } else {
        setWebhookError(null);
      }

      setIsPreviewVisible(true);

      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
    } catch (error) {
      setIsLoading(false);
      setWebhookError("Failed to request a new script. Please try again.");
      toast({
        title: "Error",
        description: "Failed to request a new script. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    isLoading,
    script,
    wordCount,
    isPreviewVisible,
    setIsPreviewVisible,
    handleScriptChange,
    handleGeneratePreview,
    handleRegenerateScript,
    handleChangeScript,
    webhookError,
    setWebhookError,
  };
};
