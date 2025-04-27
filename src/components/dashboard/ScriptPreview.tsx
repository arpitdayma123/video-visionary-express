import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useScriptPreview } from '@/hooks/useScriptPreview';
import GeneratePreviewButton from './script/GeneratePreviewButton';
import ScriptPreviewContent from './script/ScriptPreviewContent';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useScriptUtils } from '@/hooks/script/useScriptUtils';

interface ScriptPreviewProps {
  scriptOption: string;
  onUseScript: (script: string) => void;
  onScriptLoaded?: (scriptValue?: string) => void;
  webhookError?: string | null;
  setWebhookError?: (err: string | null) => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript,
  onScriptLoaded,
  webhookError,
  setWebhookError
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { saveFinalScript } = useScriptUtils();

  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [waitTimeExpired, setWaitTimeExpired] = useState(false);
  const [hasUsedScript, setHasUsedScript] = useState(false);
  const [previousScriptOption, setPreviousScriptOption] = useState<string>(scriptOption);

  const {
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
    webhookError: previewError,
    setWebhookError: setPreviewWebhookError,
  } = useScriptPreview(user, onUseScript, scriptOption);

  // Only reset when the script option actually changes
  useEffect(() => {
    if (previousScriptOption !== scriptOption) {
      console.log('ScriptPreview - Script option changed from:', previousScriptOption, 'to:', scriptOption);
      
      // Reset UI state
      setGenerationStartTime(null);
      setWaitTimeExpired(false);
      setHasUsedScript(false);
      
      // Force visibility based on script option - always hide preview when switching options
      // Only ai_remake should show preview immediately
      setIsPreviewVisible(scriptOption === 'ai_remake');
      
      // Reset error state
      if (setWebhookError) setWebhookError(null);
      
      // Force reset any script content in the parent
      if (onScriptLoaded) onScriptLoaded('');
      
      // Reset the preview state in the database
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
      
      // Update the previous script option
      setPreviousScriptOption(scriptOption);
    }
  }, [scriptOption, setIsPreviewVisible, setWebhookError, user, onScriptLoaded, previousScriptOption]);

  // Propagate webhook errors up to parent if needed
  useEffect(() => {
    if (setWebhookError) setWebhookError(previewError ?? null);
  }, [previewError, setWebhookError]);

  const handleUseScript = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      await saveFinalScript(user, script);
      setHasUsedScript(true);
      if (onUseScript) onUseScript(script);
      toast({ title: "Script Confirmed", description: "This script will be used for video generation." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to confirm script. Please try again.", variant: "destructive" });
    }
  };

  const handleRegenerateWithSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleRegenerateScript();
    setHasUsedScript(false);
  };

  // Notify parent when script is loaded
  useEffect(() => {
    if (!isLoading && script) {
      setIsPreviewVisible(true);
      if (onScriptLoaded) onScriptLoaded(script);
    }
  }, [isLoading, script, onScriptLoaded, setIsPreviewVisible]);

  const showUseScriptButton = scriptOption === 'ai_find' || scriptOption === 'ig_reel' || scriptOption === 'script_from_prompt';

  // Fixed handler to prevent double webhook calls
  const handleGeneratePreviewClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGenerationStartTime(Date.now());
    setWaitTimeExpired(false);
    
    // Simply call the handler from useScriptPreview hook
    // which will handle the webhook call properly
    handleGeneratePreview();
  };

  // Log the current state for debugging
  console.log('ScriptPreview render:', {
    scriptOption,
    previousScriptOption,
    isPreviewVisible,
    isLoading,
    hasScript: !!script
  });

  // For ai_remake, always show content immediately
  if (scriptOption === 'ai_remake') {
    return (
      <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <ScriptPreviewContent
          isLoading={isLoading}
          script={script}
          wordCount={wordCount}
          onScriptChange={handleScriptChange}
          onRegenerateScript={handleRegenerateScript}
        />
      </div>
    );
  }
  
  // For other options, show button first, then preview after generation
  return !isPreviewVisible ? (
    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <GeneratePreviewButton
        isLoading={isLoading}
        onGenerate={handleGeneratePreviewClick}
        scriptOption={scriptOption}
        generationStartTime={generationStartTime}
        waitTimeExpired={waitTimeExpired}
      />
    </div>
  ) : (
    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <ScriptPreviewContent
        isLoading={isLoading}
        script={script}
        wordCount={wordCount}
        onScriptChange={handleScriptChange}
        onRegenerateScript={handleRegenerateWithSave}
        showChangeScript={scriptOption === 'ai_find'}
        onChangeScript={
          scriptOption === 'ai_find'
            ? (e) => { e.preventDefault(); e.stopPropagation(); handleChangeScript(); }
            : undefined
        }
        showUseScriptButton={showUseScriptButton}
        onUseScript={handleUseScript}
        useScriptDisabled={false}
      />
    </div>
  );
};

export default ScriptPreview;
