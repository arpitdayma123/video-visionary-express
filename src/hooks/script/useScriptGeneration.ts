
import { useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useScriptWebhook } from './useScriptWebhook';
import { useScriptUtils } from './useScriptUtils';

interface UseScriptGenerationProps {
  user: User | null;
  scriptOption: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  pollingInterval: React.MutableRefObject<NodeJS.Timeout | null>;
  isGeneratingRef: React.MutableRefObject<boolean>;
  setPollingAttempts: (attempts: number) => void;
  checkPreviewStatus: () => Promise<void>;
  userQuery?: string;
}

export const useScriptGeneration = ({
  user, 
  scriptOption, 
  isLoading,
  setIsLoading,
  pollingInterval,
  isGeneratingRef,
  setPollingAttempts,
  checkPreviewStatus,
  userQuery
}: UseScriptGenerationProps) => {
  const SCRIPT_FIND_WEBHOOK = "https://n8n.latestfreegames.online/webhook/scriptfind";
  const { toast } = useToast();
  const { saveFinalScript } = useScriptUtils();
  const { 
    callWebhook,
    webhookError,
    setWebhookError,
    resetWebhookState
  } = useScriptWebhook();

  const handleGeneratePreview = useCallback(async () => {
    if (!user) return;
    
    // Prevent duplicate calls
    if (isGeneratingRef.current) {
      console.log('Script generation already in progress, preventing duplicate call');
      return;
    }
    
    console.log(`Starting handleGeneratePreview for option: ${scriptOption}`);
    
    // Set the generating flag
    isGeneratingRef.current = true;
    
    // Reset state
    resetWebhookState();
    setIsLoading(true);
    
    try {
      console.log('Setting database preview status to generating...');
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      // Construct the webhook URL with user query when provided and applicable
      let webhookUrl = `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&regenerate=false&scriptOption=${scriptOption}`;
      
      // Add user_query parameter if script option is script_from_prompt
      if (scriptOption === 'script_from_prompt' && userQuery) {
        webhookUrl += `&user_query=${encodeURIComponent(userQuery)}`;
      }
      
      // Add reelUrl parameter if script option is ig_reel
      if (scriptOption === 'ig_reel') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('reel_url')
          .eq('id', user.id)
          .single();
          
        if (profile?.reel_url) {
          webhookUrl += `&reelUrl=${encodeURIComponent(profile.reel_url)}`;
        }
      }

      console.log('Calling webhook for initial generation:', webhookUrl);

      // Call the webhook with retry logic
      try {
        await callWebhook(webhookUrl);
        setWebhookError(null);
      } catch (error) {
        console.error('All webhook attempts failed:', error);
        setWebhookError(error instanceof Error ? error.message : "Failed to call webhook");
        // Continue with polling even if webhook fails
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
  }, [user, isGeneratingRef, resetWebhookState, setIsLoading, scriptOption, userQuery, callWebhook, setWebhookError, pollingInterval, setPollingAttempts, checkPreviewStatus, toast]);

  const handleRegenerateScript = useCallback(async () => {
    if (!user) return;
    
    // Prevent duplicate calls
    if (isGeneratingRef.current) {
      console.log('Script regeneration already in progress, preventing duplicate call');
      return;
    }
    
    console.log(`Starting handleRegenerateScript for option: ${scriptOption}`);
    
    // Set the generating flag
    isGeneratingRef.current = true;
    
    // Reset state
    resetWebhookState();
    setIsLoading(true);
    
    try {
      console.log('Setting database preview status to generating for regeneration...');
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      // Construct webhook URL with user query for script_from_prompt
      let webhookUrl = `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&regenerate=true&scriptOption=${scriptOption}`;
      
      // Add user_query parameter if script option is script_from_prompt
      if (scriptOption === 'script_from_prompt' && userQuery) {
        webhookUrl += `&user_query=${encodeURIComponent(userQuery)}`;
      }
      
      // Add reelUrl parameter if script option is ig_reel
      if (scriptOption === 'ig_reel') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('reel_url')
          .eq('id', user.id)
          .single();
          
        if (profile?.reel_url) {
          webhookUrl += `&reelUrl=${encodeURIComponent(profile.reel_url)}`;
        }
      }

      console.log('Calling webhook for regeneration:', webhookUrl);
      
      // Call the webhook with retry logic
      try {
        await callWebhook(webhookUrl);
        setWebhookError(null);
      } catch (error) {
        console.error('All webhook attempts failed:', error);
        setWebhookError(error instanceof Error ? error.message : "Failed to call webhook");
        // Continue with polling even if webhook fails
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
  }, [user, isGeneratingRef, resetWebhookState, setIsLoading, scriptOption, userQuery, callWebhook, setWebhookError, pollingInterval, setPollingAttempts, checkPreviewStatus, toast]);

  const handleChangeScript = useCallback(async () => {
    if (!user) return;
    
    // Prevent duplicate calls
    if (isGeneratingRef.current) {
      console.log('Script change already in progress, preventing duplicate call');
      return;
    }
    
    // Set the generating flag
    isGeneratingRef.current = true;
    
    // Reset state
    resetWebhookState();
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      const webhookUrl = `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&changescript=true&scriptOption=${scriptOption}`;
      console.log('Calling webhook for changing script:', webhookUrl);
      
      // Call the webhook with retry logic
      try {
        await callWebhook(webhookUrl);
        setWebhookError(null);
      } catch (error) {
        console.error('All webhook attempts failed:', error);
        setWebhookError(error instanceof Error ? error.message : "Failed to call webhook");
        // Continue with polling even if webhook fails
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
  }, [user, isGeneratingRef, resetWebhookState, setIsLoading, scriptOption, callWebhook, setWebhookError, pollingInterval, setPollingAttempts, checkPreviewStatus, toast]);

  return {
    webhookError,
    setWebhookError,
    handleGeneratePreview,
    handleRegenerateScript,
    handleChangeScript
  };
};
