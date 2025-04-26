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

  const {
    isLoading,
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

  useEffect(() => {
    if (setWebhookError) setWebhookError(previewError ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewError, setWebhookError]);

  useEffect(() => {
    setIsPreviewVisible(scriptOption === 'ai_remake');
    setHasUsedScript(false);
    console.log('ScriptPreview - Initial visibility set:', { 
      scriptOption, 
      isVisible: scriptOption === 'ai_remake'
    });
  }, [scriptOption, setIsPreviewVisible]);

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
    if (
      (scriptOption === 'ai_find' || scriptOption === 'ig_reel') &&
      user &&
      script
    ) {
      try {
        await saveFinalScript(user, script);
      } catch (error) {
        toast({ title: "Error", description: "Failed to save current script before regenerating.", variant: "destructive" });
      }
      setHasUsedScript(false);
    }
    handleRegenerateScript();
  };

  useEffect(() => {
    if (!isLoading && script) {
      setIsPreviewVisible(true);
      if (onScriptLoaded) onScriptLoaded(script);
    }
  }, [isLoading, script, onScriptLoaded, setIsPreviewVisible]);

  const showUseScriptButton = scriptOption === 'ai_find' || scriptOption === 'ig_reel';

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
        `https://n8n.latestfreegames.online/webhook/scriptfind?userId=${user.id}&regenerate=false`,
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

      // Check for the specific error message and reset UI state
      if (responseJson?.error && responseJson.error.includes("The Instagram username you entered either does not provide valuable content")) {
        setIsLoading(false);
        setIsPreviewVisible(false);
        setWebhookError?.(responseJson.error);
        toast({
          title: "Content Error",
          description: "Please update your Instagram competitors and try again.",
          variant: "destructive"
        });
        return;
      }

      if (responseJson && responseJson.error) {
        setIsLoading(false);
        setWebhookError?.(responseJson.error);
        setIsPreviewVisible(false);
        toast({
          title: "Script generation error",
          description: responseJson.error,
          variant: "destructive"
        });
        return;
      } else {
        setWebhookError?.(null);
      }

      setIsPreviewVisible(true);
      
    } catch (error) {
      setIsLoading(false);
      setWebhookError?.("Failed to start preview generation. Please try again.");
      toast({
        title: "Error",
        description: "Failed to start preview generation. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    scriptOption === 'ai_remake'
      ? (
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <ScriptPreviewContent
            isLoading={isLoading}
            script={script}
            wordCount={wordCount}
            onScriptChange={handleScriptChange}
            onRegenerateScript={handleRegenerateScript}
          />
        </div>
      ) : 
      (!isPreviewVisible ? (
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <GeneratePreviewButton
            isLoading={isLoading}
            onGenerate={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setGenerationStartTime(Date.now());
              setWaitTimeExpired(false);
              handleGeneratePreview();
            }}
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
            onUseScript={
              (scriptOption === 'ai_find' || scriptOption === 'ig_reel')
                ? handleUseScript
                : undefined
            }
            useScriptDisabled={false}
          />
        </div>
      ))
  );
};

export default ScriptPreview;
