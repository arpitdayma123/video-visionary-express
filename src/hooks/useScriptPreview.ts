
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
  const isGeneratingRef = useRef(false);
  
  const { toast } = useToast();
  const { updateWordCount, saveCustomScript, saveFinalScript } = useScriptUtils();
  const { 
    checkPreviewStatus, 
    startPolling, 
    pollingInterval, 
    waitTimeExpired, 
    generationStartTime
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
      
      // Reset the generating ref
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
      previousScriptOptionRef,
      waitTimeExpired,
      generationStartTime
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
    
    // Prevent duplicate requests
    if (isGeneratingRef.current) {
      console.log('useScriptPreview - Already generating, ignoring duplicate request');
      return;
    }
    
    // Set generating flag
    isGeneratingRef.current = true;
    
    // Reset any previous script and visibility state
    setScript('');
    setWordCount(0);
    setIsLoading(true);
    setWebhookError(null);
    
    try {
      console.log('useScriptPreview - Updating profile preview status to "generating"');
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

      console.log('useScriptPreview - Calling webhook:', webhookUrl);
      
      // Set a longer timeout for the fetch request (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const webhookResponse = await fetch(
          webhookUrl,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            signal: controller.signal
          }
        );
        
        // Clear the timeout
        clearTimeout(timeoutId);

        let responseJson: any = null;
        try {
          responseJson = await webhookResponse.clone().json();
        } catch (parseError) {
          console.error('useScriptPreview - Failed to parse webhook response:', parseError);
        }

        // Handle the specific error case
        if (responseJson?.error && responseJson.error.includes("The Instagram username you entered either does not provide valuable content")) {
          setIsLoading(false);
          setIsPreviewVisible(false);
          setScript('');
          setWebhookError(responseJson.error);
          isGeneratingRef.current = false;
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
          isGeneratingRef.current = false;
          return;
        } else {
          setWebhookError(null);
        }
        
        console.log('useScriptPreview - Webhook called successfully, starting polling');
        // Start polling (this will create and store the interval)
        startPolling();
        
      } catch (fetchError) {
        // Clear the timeout if abort wasn't the cause
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.log('useScriptPreview - Fetch request timed out, but continuing with polling');
          toast({
            title: "Script Generation Started",
            description: "Script generation is taking longer than usual. We'll continue checking for your script.",
            variant: "default"
          });
          
          // Even if the initial request times out, we still want to start polling
          // as the webhook might still be processing on the server
          startPolling();
        } else {
          console.error('useScriptPreview - Fetch error:', fetchError);
          setIsLoading(false);
          setWebhookError(fetchError instanceof Error ? fetchError.message : "An error occurred");
          toast({
            title: "Error",
            description: "Failed to generate script preview. Please try again.",
            variant: "destructive"
          });
          isGeneratingRef.current = false;
        }
      }
      
    } catch (error) {
      setIsLoading(false);
      setWebhookError(error instanceof Error ? error.message : "An error occurred");
      toast({
        title: "Error",
        description: "Failed to generate script preview. Please try again.",
        variant: "destructive"
      });
      isGeneratingRef.current = false;
    }
  };

  const handleRegenerateScript = async () => {
    if (!user) return;
    
    // Prevent duplicate requests
    if (isGeneratingRef.current) {
      console.log('useScriptPreview - Already generating, ignoring duplicate regenerate request');
      return;
    }
    
    // Set generating flag
    isGeneratingRef.current = true;
    
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
    setWebhookError(null);
    
    try {
      console.log('useScriptPreview - Updating profile preview status to "generating" for regeneration');
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

      console.log('useScriptPreview - Calling webhook for regeneration:', webhookUrl);
      
      // Set a longer timeout for the fetch request (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const webhookResponse = await fetch(
          webhookUrl,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            signal: controller.signal
          }
        );
        
        // Clear the timeout
        clearTimeout(timeoutId);

        let responseJson: any = null;
        try {
          responseJson = await webhookResponse.clone().json();
        } catch (parseError) {
          console.error('useScriptPreview - Failed to parse webhook response during regeneration:', parseError);
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
          isGeneratingRef.current = false;
          return;
        } else {
          setWebhookError(null);
        }
        
        console.log('useScriptPreview - Regeneration webhook called successfully, starting polling');
        startPolling();
        
      } catch (fetchError) {
        // Clear the timeout if abort wasn't the cause
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.log('useScriptPreview - Regeneration fetch request timed out, but continuing with polling');
          toast({
            title: "Script Regeneration Started",
            description: "Script regeneration is taking longer than usual. We'll continue checking for your script.",
            variant: "default"
          });
          
          // Even if the initial request times out, we still want to start polling
          startPolling();
        } else {
          console.error('useScriptPreview - Regeneration fetch error:', fetchError);
          setIsLoading(false);
          setWebhookError("Failed to regenerate script. Please try again.");
          toast({
            title: "Error",
            description: "Failed to regenerate script. Please try again.",
            variant: "destructive"
          });
          isGeneratingRef.current = false;
        }
      }
      
    } catch (error) {
      setIsLoading(false);
      setWebhookError("Failed to regenerate script. Please try again.");
      toast({
        title: "Error",
        description: "Failed to regenerate script. Please try again.",
        variant: "destructive"
      });
      isGeneratingRef.current = false;
    }
  };

  const handleChangeScript = async () => {
    if (!user) return;
    
    // Prevent duplicate requests
    if (isGeneratingRef.current) {
      console.log('useScriptPreview - Already generating, ignoring duplicate change script request');
      return;
    }
    
    // Set generating flag
    isGeneratingRef.current = true;
    
    // Reset the script content and word count
    setScript('');
    setWordCount(0);
    setIsLoading(true);
    setWebhookError(null);

    try {
      console.log('useScriptPreview - Updating profile preview status to "generating" for script change');
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      console.log('useScriptPreview - Calling webhook for script change');
      
      // Set a longer timeout for the fetch request (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const webhookResponse = await fetch(
          `${SCRIPT_FIND_WEBHOOK}?userId=${user.id}&changescript=true`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            signal: controller.signal
          }
        );
        
        // Clear the timeout
        clearTimeout(timeoutId);

        let responseJson: any = null;
        try {
          responseJson = await webhookResponse.clone().json();
        } catch (parseError) {
          console.error('useScriptPreview - Failed to parse webhook response during script change:', parseError);
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
          isGeneratingRef.current = false;
          return;
        } else {
          setWebhookError(null);
        }

        console.log('useScriptPreview - Script change webhook called successfully, starting polling');
        startPolling();
        
      } catch (fetchError) {
        // Clear the timeout if abort wasn't the cause
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.log('useScriptPreview - Script change fetch request timed out, but continuing with polling');
          toast({
            title: "Script Change Started",
            description: "Script change is taking longer than usual. We'll continue checking for your script.",
            variant: "default"
          });
          
          // Even if the initial request times out, we still want to start polling
          startPolling();
        } else {
          console.error('useScriptPreview - Script change fetch error:', fetchError);
          setIsLoading(false);
          setWebhookError("Failed to request a new script. Please try again.");
          toast({
            title: "Error",
            description: "Failed to request a new script. Please try again.",
            variant: "destructive"
          });
          isGeneratingRef.current = false;
        }
      }
      
    } catch (error) {
      setIsLoading(false);
      setWebhookError("Failed to request a new script. Please try again.");
      toast({
        title: "Error",
        description: "Failed to request a new script. Please try again.",
        variant: "destructive"
      });
      isGeneratingRef.current = false;
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
    waitTimeExpired,
    generationStartTime
  };
};
