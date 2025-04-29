
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
      
      // Add user_query parameter if script option is script_from_prompt
      if (scriptOption === 'script_from_prompt' && userQuery) {
        webhookUrl += `&user_query=${encodeURIComponent(userQuery)}`;
      }

      console.log('Calling webhook:', webhookUrl);
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
        // Handle network errors specifically
        if (err.name === 'AbortError') {
          console.log('Fetch request was aborted due to timeout');
          return null; // Return null to indicate aborted request
        }
        throw err; // Re-throw other errors
      });

      // Clear the timeout as we got a response or handled the abort
      clearTimeout(timeoutId);
      
      // Handle aborted request or timeout
      if (!webhookResponse) {
        console.log('No webhook response (likely due to timeout), continuing with polling anyway');
        // We'll continue with polling even though the initial webhook may have failed
      } else {
        // Try to parse response if available
        let responseJson: any = null;
        try {
          responseJson = await webhookResponse.clone().json();
        } catch (error) { 
          console.error('Failed to parse webhook response:', error);
        }

        // Handle the specific error case
        if (responseJson?.error && responseJson.error.includes("The Instagram username you entered either does not provide valuable content")) {
          isGeneratingRef.current = false;
          setIsLoading(false);
          setIsPreviewVisible(false);
          setScript('');
          setWebhookError(responseJson.error);
          return;
        }

        // If error in webhook payload, show error, stop, don't run polling.
        if (responseJson && responseJson.error) {
          isGeneratingRef.current = false;
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
      }
      
      // Start or restart polling regardless of webhook response
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
    // This applies for all script options, including script_from_prompt
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
      
      // Add user_query parameter if script option is script_from_prompt
      if (scriptOption === 'script_from_prompt' && userQuery) {
        webhookUrl += `&user_query=${encodeURIComponent(userQuery)}`;
      }

      console.log('Calling webhook for regeneration:', webhookUrl);
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
          console.log('Regenerate fetch request was aborted due to timeout');
          return null;
        }
        throw err;
      });

      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Handle aborted request or timeout
      if (!webhookResponse) {
        console.log('No webhook response for regeneration (likely due to timeout), continuing with polling anyway');
      } else {
        let responseJson: any = null;
        try {
          responseJson = await webhookResponse.clone().json();
        } catch (error) {
          console.error('Failed to parse regeneration webhook response:', error);
        }

        if (responseJson && responseJson.error) {
          isGeneratingRef.current = false;
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
      }
      
      // Start or restart polling regardless of webhook response
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

      console.log('Calling webhook for changing script...');
      const webhookResponse = await fetch(
        `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&changescript=true`,
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
          console.log('Change script fetch request was aborted due to timeout');
          return null;
        }
        throw err;
      });

      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Handle aborted request or timeout
      if (!webhookResponse) {
        console.log('No webhook response for script change (likely due to timeout), continuing with polling anyway');
      } else {
        let responseJson: any = null;
        try {
          responseJson = await webhookResponse.clone().json();
        } catch (error) {
          console.error('Failed to parse change script webhook response:', error);
        }
        
        if (responseJson && responseJson.error) {
          isGeneratingRef.current = false;
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
      }

      // Start or restart polling regardless of webhook response
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
