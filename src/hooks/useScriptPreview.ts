
import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useScriptUtils } from './script/useScriptUtils';
import { useScriptPolling } from './script/useScriptPolling';
import { useAiRemake } from './script/useAiRemake';

export const useScriptPreview = (
  user: User | null, 
  onScriptGenerated: (script: string) => void,
  scriptOption: string,
  userQuery?: string // Add optional userQuery parameter
) => {
  const SCRIPT_FIND_WEBHOOK = "https://n8n.latestfreegames.online/webhook/scriptfind";

  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const previousScriptOptionRef = useRef(scriptOption);
  
  const { toast } = useToast();
  const { updateWordCount, saveCustomScript, saveFinalScript } = useScriptUtils();
  const { checkPreviewStatus, pollingInterval } = useScriptPolling(
    user,
    isLoading,
    handleScriptGenerated,
    scriptOption,
    setIsLoading
  );

  // Only reset state when script option actually changes, not on component remount
  useEffect(() => {
    if (previousScriptOptionRef.current !== scriptOption) {
      console.log('useScriptPreview - Script option changed from:', previousScriptOptionRef.current, 'to:', scriptOption);
      
      // Always reset script state to empty when changing options
      setScript('');
      setWordCount(0);
      
      // Only show preview immediately for ai_remake
      setIsPreviewVisible(scriptOption === 'ai_remake');
      
      // Clear any errors
      setWebhookError(null);
      
      // Make sure we're not in loading state
      setIsLoading(false);
      
      // Clear any ongoing polling
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // Update database to reset preview state
      if (user) {
        supabase
          .from('profiles')
          .update({ 
            preview: null, 
            previewscript: null 
          })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to reset preview state:', error);
            }
          });
      }
      
      // Update the reference
      previousScriptOptionRef.current = scriptOption;
    }
  }, [scriptOption, user, pollingInterval, setIsLoading]);

  // Use AI Remake hook if that option is selected
  const aiRemake = useAiRemake(user, onScriptGenerated);
  if (scriptOption === 'ai_remake') {
    return {
      ...aiRemake,
      isPreviewVisible,
      setIsPreviewVisible,
      webhookError,
      setWebhookError,
      setIsLoading,
      handleGeneratePreview: aiRemake.handleRegenerateScript,
      previousScriptOptionRef
    };
  }

  function handleScriptGenerated(newScript: string) {
    if (!newScript) {
      console.log('useScriptPreview - Empty script received, not updating preview');
      return;
    }
    
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
    
    // Reset any previous script and visibility state
    setScript('');
    setWordCount(0);
    setIsLoading(true);
    setWebhookError(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      // Construct the webhook URL with user query when provided and applicable
      let webhookUrl = `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&regenerate=false`;
      
      // Add user_query parameter if script option is script_from_prompt
      if (scriptOption === 'script_from_prompt' && userQuery) {
        webhookUrl += `&user_query=${encodeURIComponent(userQuery)}`;
      }

      const webhookResponse = await fetch(
        webhookUrl,
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

      // Handle the specific error case
      if (responseJson?.error && responseJson.error.includes("The Instagram username you entered either does not provide valuable content")) {
        setIsLoading(false);
        setIsPreviewVisible(false);
        setScript('');
        setWebhookError(responseJson.error);
        return;
      }

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
      
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
    } catch (error) {
      setIsLoading(false);
      setWebhookError(error instanceof Error ? error.message : "An error occurred");
      toast({
        title: "Error",
        description: "Failed to generate script preview. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRegenerateScript = async () => {
    if (!user) return;
    
    // First, save the current script to finalscript column if script exists
    // This applies for all script options, including script_from_prompt
    if (script) {
      try {
        console.log(`Saving current script to finalscript before regeneration. Script option: ${scriptOption}`);
        await saveFinalScript(user, script);
      } catch (error) {
        console.error('Error saving finalscript before regenerating:', error);
        toast({
          title: "Error",
          description: "Failed to save the current script before regenerating.",
          variant: "destructive"
        });
      }
    }
    
    // Reset the script content and word count
    setScript('');
    setWordCount(0);
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
    // Reset the script content and word count
    setScript('');
    setWordCount(0);
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      const webhookResponse = await fetch(
        `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&changescript=true`,
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
    setIsLoading,
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
    previousScriptOptionRef
  };
};
