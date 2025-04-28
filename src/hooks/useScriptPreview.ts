
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
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const webhookRetries = useRef(0);
  const maxWebhookRetries = 5; // Increased max retries to 5 from 3
  
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
      
      // Reset webhook retries
      webhookRetries.current = 0;
      
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

  // Improved webhook call with retry mechanism
  const callWebhook = async (url: string) => {
    const controller = new AbortController();
    // Increased timeout to 5 minutes (300,000 ms)
    const timeoutId = setTimeout(() => controller.abort(), 300000); 
    
    try {
      console.log(`Calling webhook URL (attempt ${webhookRetries.current + 1}): ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let responseJson;
      try {
        responseJson = await response.json();
      } catch (e) {
        console.warn("Could not parse webhook response as JSON, but status is OK");
        return { success: true };
      }
      
      // Reset retry counter on success
      webhookRetries.current = 0;
      return responseJson;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort (timeout) specifically
      if (error.name === 'AbortError') {
        console.error("Webhook request timed out after 5 minutes");
        throw new Error("Webhook request timed out. Please wait as processing may continue in the background.");
      }
      
      throw error;
    }
  };

  // Improved webhook call with retry logic and exponential backoff
  const callWebhookWithRetry = async (url: string) => {
    try {
      return await callWebhook(url);
    } catch (error) {
      console.error(`Webhook attempt ${webhookRetries.current + 1} failed:`, error);
      
      // Implement retry logic
      if (webhookRetries.current < maxWebhookRetries) {
        webhookRetries.current++;
        
        // Exponential backoff for retries (1s, 2s, 4s, 8s, 16s)
        const backoffTime = Math.pow(2, webhookRetries.current - 1) * 1000;
        console.log(`Retrying webhook in ${backoffTime}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return callWebhookWithRetry(url); // Retry
      } else {
        // Reset retries for next attempt
        webhookRetries.current = 0;
        throw error; // All retries failed
      }
    }
  };

  const handleGeneratePreview = async () => {
    if (!user) return;
    
    // Reset any previous script and visibility state
    setScript('');
    setWordCount(0);
    setIsLoading(true);
    setWebhookError(null);
    setGenerationStartTime(Date.now());
    webhookRetries.current = 0;
    
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

      let responseJson;
      try {
        responseJson = await callWebhookWithRetry(webhookUrl);
      } catch (error) {
        console.error("All webhook retries failed:", error);
        
        // Even if the webhook call fails, we might still continue polling
        // because the process might have started in the background
        
        if (error.message && error.message.includes("timed out")) {
          // Special handling for timeouts - don't error out, just start polling
          toast({
            title: "Webhook Processing",
            description: "The request is taking longer than expected, but we'll continue waiting for results.",
            variant: "default"
          });
          
          // Start polling anyway in case the backend process was started
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
          }
          const interval = setInterval(checkPreviewStatus, 3000); // Poll every 3 seconds
          pollingInterval.current = interval;
          
          return;
        } else {
          // For other errors, show error message
          setIsLoading(false);
          setWebhookError("Failed to connect to the script generator. Please try again later.");
          toast({
            title: "Connection Error",
            description: "Failed to reach our script generator. Please try again in a moment.",
            variant: "destructive"
          });
          return;
        }
      }

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
      const interval = setInterval(checkPreviewStatus, 3000); // Poll every 3 seconds
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
    setGenerationStartTime(Date.now());
    webhookRetries.current = 0;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      // Construct webhook URL with user query for script_from_prompt
      let webhookUrl = `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&regenerate=true`;
      
      // Add user_query parameter if script option is script_from_prompt
      if (scriptOption === 'script_from_prompt' && userQuery) {
        webhookUrl += `&user_query=${encodeURIComponent(userQuery)}`;
      }

      let responseJson;
      try {
        responseJson = await callWebhookWithRetry(webhookUrl);
      } catch (error) {
        console.error("All webhook retries failed:", error);
        
        // Special handling for timeouts - don't error out, just start polling
        if (error.message && error.message.includes("timed out")) {
          toast({
            title: "Webhook Processing",
            description: "The request is taking longer than expected, but we'll continue waiting for results.",
            variant: "default"
          });
          
          // Start polling anyway in case the backend process was started
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
          }
          const interval = setInterval(checkPreviewStatus, 3000);
          pollingInterval.current = interval;
          
          return;
        } else {
          setIsLoading(false);
          setWebhookError("Failed to connect to the script generator. Please try again later.");
          toast({
            title: "Connection Error",
            description: "Failed to reach our script generator. Please try again in a moment.",
            variant: "destructive"
          });
          return;
        }
      }

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
      const interval = setInterval(checkPreviewStatus, 3000);
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
    setGenerationStartTime(Date.now());
    webhookRetries.current = 0;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      let responseJson;
      try {
        const webhookUrl = `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&changescript=true`;
        responseJson = await callWebhookWithRetry(webhookUrl);
      } catch (error) {
        console.error("All webhook retries failed:", error);
        
        // Special handling for timeouts - don't error out, just start polling
        if (error.message && error.message.includes("timed out")) {
          toast({
            title: "Webhook Processing",
            description: "The request is taking longer than expected, but we'll continue waiting for results.",
            variant: "default"
          });
          
          // Start polling anyway in case the backend process was started
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
          }
          const interval = setInterval(checkPreviewStatus, 3000);
          pollingInterval.current = interval;
          
          return;
        } else {
          setIsLoading(false);
          setWebhookError("Failed to connect to the script generator. Please try again later.");
          toast({
            title: "Connection Error",
            description: "Failed to reach our script generator. Please try again in a moment.",
            variant: "destructive"
          });
          return;
        }
      }
      
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
      const interval = setInterval(checkPreviewStatus, 3000);
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
    previousScriptOptionRef,
    generationStartTime
  };
};
