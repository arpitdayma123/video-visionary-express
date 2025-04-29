
import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useScriptUtils } from './script/useScriptUtils';
import { useScriptPolling } from './script/useScriptPolling';
import { useAiRemake } from './script/useAiRemake';
import { useScriptGeneration } from './script/useScriptGeneration';
import { useScriptWebhook } from './script/useScriptWebhook';

export const useScriptPreview = (
  user: User | null, 
  onScriptGenerated: (script: string) => void,
  scriptOption: string,
  userQuery?: string
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const previousScriptOptionRef = useRef(scriptOption);
  const isGeneratingRef = useRef(false);
  
  const { toast } = useToast();
  const { updateWordCount, saveCustomScript, saveFinalScript } = useScriptUtils();
  const { 
    webhookError, 
    setWebhookError, 
    cleanupWebhookResources,
    resetWebhookState
  } = useScriptWebhook();
  
  const { checkPreviewStatus, pollingInterval, pollingAttempts, setPollingAttempts } = useScriptPolling(
    user,
    isLoading,
    handleScriptGenerated,
    scriptOption,
    setIsLoading
  );
  
  const {
    handleGeneratePreview,
    handleRegenerateScript,
    handleChangeScript
  } = useScriptGeneration({
    user,
    scriptOption,
    isLoading,
    setIsLoading,
    pollingInterval,
    isGeneratingRef,
    setPollingAttempts,
    checkPreviewStatus,
    userQuery
  });

  // Only reset state when script option actually changes
  useEffect(() => {
    if (previousScriptOptionRef.current !== scriptOption) {
      console.log('useScriptPreview - Script option changed from:', previousScriptOptionRef.current, 'to:', scriptOption);
      
      // Reset generating flag
      isGeneratingRef.current = false;
      
      // Always reset script state to empty when changing options
      setScript('');
      setWordCount(0);
      
      // Only show preview immediately for ai_remake
      setIsPreviewVisible(scriptOption === 'ai_remake');
      
      // Clear any errors
      setWebhookError(null);
      resetWebhookState();
      
      // Make sure we're not in loading state
      setIsLoading(false);
      
      // Clear any ongoing polling
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // Reset polling attempts
      setPollingAttempts(0);
      
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
  }, [scriptOption, user, pollingInterval, setIsLoading, setPollingAttempts, setWebhookError, resetWebhookState]);

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
    
    // Reset generating flag when script is generated
    isGeneratingRef.current = false;
    
    setWebhookError(null); // clear errors on successful script
    setScript(newScript);
    setWordCount(updateWordCount(newScript));
    setIsPreviewVisible(true);
    console.log('useScriptPreview - Script generated, setting preview visible to true');
    onScriptGenerated(newScript);
  }

  const handleScriptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newScript = e.target.value;
    setScript(newScript);
    setWordCount(updateWordCount(newScript));
    if (user && scriptOption === 'ai_remake') {
      saveCustomScript(user, newScript);
    }
  }, [user, scriptOption, updateWordCount, saveCustomScript]);

  // Cleanup webhook resources on unmount
  useEffect(() => {
    return () => {
      cleanupWebhookResources();
    };
  }, [cleanupWebhookResources]);

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
