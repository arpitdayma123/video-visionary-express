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
  const FETCH_TIMEOUT = 20000; // 20 seconds timeout for fetch requests
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // 1 second

  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const previousScriptOptionRef = useRef(scriptOption);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef(false);
  
  const { toast } = useToast();
  const { updateWordCount, saveCustomScript, saveFinalScript } = useScriptUtils();
  const { 
    checkPreviewStatus, 
    pollingInterval, 
    pollingAttempts, 
    setPollingAttempts 
  } = useScriptPolling(
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
      
      // Abort any in-progress fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Reset polling attempts
      setPollingAttempts(0);
      
      // Reset generating flag
      isGeneratingRef.current = false;
      
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
  }, [scriptOption, user, pollingInterval, setIsLoading, setPollingAttempts]);

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

  // Enhanced fetch with retry logic
  const fetchWithRetry = async (url: string, options: RequestInit, retriesLeft = MAX_RETRIES) => {
    try {
      console.log(`Attempting to fetch: ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Webhook response not OK (${response.status}):`, errorText);
        
        // If we have retries left and it's a 5xx error (server error) or rate limiting (429)
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

  const callWebhook = async (url: string, abortController: AbortController) => {
    try {
      console.log(`Calling webhook: ${url}`);
      
      const webhookResponse = await fetchWithRetry(
        url,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Origin': window.location.origin
          },
          credentials: 'omit', // Don't send cookies for CORS
          signal: abortController.signal
        }
      );

      // Try to parse response if available
      try {
        const responseData = await webhookResponse.json();
        console.log('Webhook response data:', responseData);
        
        // Handle the specific error case
        if (responseData.error) {
          setWebhookError(responseData.error);
          return false;
        }
      } catch (error) { 
        console.log('Webhook response is not JSON or has no data, continuing with polling');
      }
      
      return true;
    } catch (error) {
      console.error('Error calling webhook:', error);
      
      if (error instanceof Error) {
        setWebhookError(error.message);
      } else {
        setWebhookError("An unknown error occurred");
      }
      
      return false;
    }
  };

  const handleGeneratePreview = async () => {
    if (!user) return;
    
    // Prevent duplicate calls
    if (isGeneratingRef.current) {
      console.log('Script generation already in progress, preventing duplicate call');
      return;
    }
    
    // Set the generating flag
    isGeneratingRef.current = true;
    
    // Reset any previous script and visibility state
    setScript('');
    setWordCount(0);
    setIsLoading(true);
    setWebhookError(null);
    
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
      console.log('Setting database preview status to generating...');
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      // Construct the webhook URL with user query when provided and applicable
      let webhookUrl = `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&regenerate=false`;
      
      // Add scriptOption parameter
      webhookUrl += `&scriptOption=${scriptOption}`;
      
      // Add user_query parameter if script option is script_from_prompt
      if (scriptOption === 'script_from_prompt' && userQuery) {
        webhookUrl += `&user_query=${encodeURIComponent(userQuery)}`;
      }

      // Call the webhook
      const webhookSuccess = await callWebhook(webhookUrl, abortController);
      
      // Clear the timeout as we got a response or handled the abort
      clearTimeout(timeoutId);
      
      // If the webhook call failed completely, stop the loading state
      if (!webhookSuccess) {
        isGeneratingRef.current = false;
        setIsLoading(false);
        return;
      }
      
      // Start or restart polling
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      
      // Reset polling attempts
      setPollingAttempts(0);
      
      console.log('Starting polling for script generation result...');
      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
      
    } catch (error) {
      console.error('Error in handleGeneratePreview:', error);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Reset the generating flag
      isGeneratingRef.current = false;
      
      // Show different message based on error type
      const errorMessage = error instanceof Error && error.name === 'AbortError' 
        ? "Request timed out. The server might be busy. Please try again."
        : "Failed to generate script preview. Please try again.";
      
      setIsLoading(false);
      setWebhookError(error instanceof Error ? error.message : "An error occurred");
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
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
    
    // First, save the current script to finalscript column if script exists
    if (script) {
      try {
        console.log(`Saving current script to finalscript before regeneration. Script option: ${scriptOption}`);
        await saveFinalScript(user, script);
      } catch (error) {
        console.error('Error saving finalscript before regenerating:', error);
        
        // Don't block regeneration if saving fails
        toast({
          title: "Warning",
          description: "Failed to save the current script before regenerating, but continuing anyway.",
          variant: "default"
        });
      }
    }
    
    // Reset the script content and word count
    setScript('');
    setWordCount(0);
    setIsLoading(true);
    setWebhookError(null);
    
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
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      // Construct webhook URL with user query for script_from_prompt
      let webhookUrl = `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&regenerate=true`;
      
      // Add scriptOption parameter
      webhookUrl += `&scriptOption=${scriptOption}`;
      
      // Add user_query parameter if script option is script_from_prompt
      if (scriptOption === 'script_from_prompt' && userQuery) {
        webhookUrl += `&user_query=${encodeURIComponent(userQuery)}`;
      }

      console.log('Calling webhook for regeneration:', webhookUrl);
      const webhookSuccess = await callWebhook(webhookUrl, abortController);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // If the webhook call failed completely, stop the loading state
      if (!webhookSuccess) {
        isGeneratingRef.current = false;
        setIsLoading(false);
        return;
      }
      
      // Start or restart polling
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      
      // Reset polling attempts
      setPollingAttempts(0);
      
      console.log('Starting polling for regeneration result...');
      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
      
    } catch (error) {
      console.error('Error in handleRegenerateScript:', error);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Reset the generating flag
      isGeneratingRef.current = false;
      
      // Show different message based on error type
      const errorMessage = error instanceof Error && error.name === 'AbortError' 
        ? "Request timed out. The server might be busy. Please try again."
        : "Failed to regenerate script. Please try again.";
      
      setIsLoading(false);
      setWebhookError(error instanceof Error ? error.message : "Failed to regenerate script. Please try again.");
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleChangeScript = async () => {
    if (!user) return;
    
    // Prevent duplicate calls
    if (isGeneratingRef.current) {
      console.log('Script change already in progress, preventing duplicate call');
      return;
    }
    
    // Set the generating flag
    isGeneratingRef.current = true;
    
    // Reset the script content and word count
    setScript('');
    setWordCount(0);
    setIsLoading(true);
    setWebhookError(null);
    
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
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      // Construct webhook URL for changing script
      let webhookUrl = `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&changescript=true`;
      
      // Add scriptOption parameter
      webhookUrl += `&scriptOption=${scriptOption}`;
      
      // Add user_query parameter if script option is script_from_prompt
      if (scriptOption === 'script_from_prompt' && userQuery) {
        webhookUrl += `&user_query=${encodeURIComponent(userQuery)}`;
      }

      console.log('Calling webhook for changing script:', webhookUrl);
      const webhookSuccess = await callWebhook(webhookUrl, abortController);

      // Clear the timeout
      clearTimeout(timeoutId);
      
      // If the webhook call failed completely, stop the loading state
      if (!webhookSuccess) {
        isGeneratingRef.current = false;
        setIsLoading(false);
        return;
      }

      // Start or restart polling
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      
      // Reset polling attempts
      setPollingAttempts(0);
      
      console.log('Starting polling for script change result...');
      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
      
    } catch (error) {
      console.error('Error in handleChangeScript:', error);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Reset the generating flag
      isGeneratingRef.current = false;
      
      // Show different message based on error type
      const errorMessage = error instanceof Error && error.name === 'AbortError' 
        ? "Request timed out. The server might be busy. Please try again."
        : "Failed to request a new script. Please try again.";
      
      setIsLoading(false);
      setWebhookError(error instanceof Error ? error.message : "Failed to request a new script. Please try again.");
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Add a cleanup effect for the abortController
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

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
