
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
  // Called whenever "Use This Script" is clicked and script is confirmed/saved
  onUseScript: (script: string) => void;
  onScriptLoaded?: (scriptValue?: string) => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript,
  onScriptLoaded
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { saveFinalScript } = useScriptUtils();

  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [waitTimeExpired, setWaitTimeExpired] = useState(false);

  // For ai_find/ig_reel: track if "Use This Script" was ever clicked
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
  } = useScriptPreview(user, onUseScript, scriptOption);

  // Reset on script option change
  useEffect(() => {
    setIsPreviewVisible(scriptOption === 'ai_remake');
    setHasUsedScript(false);
    console.log('ScriptPreview - Initial visibility set:', { 
      scriptOption, 
      isVisible: scriptOption === 'ai_remake'
    });
  }, [scriptOption, setIsPreviewVisible]);

  // Each time user clicks "Use This Script", always save the script and notify parent
  const handleUseScript = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      await saveFinalScript(user, script);
      setHasUsedScript(true); // For this session
      if (onUseScript) onUseScript(script); // update parent state
      toast({ title: "Script Confirmed", description: "This script will be used for video generation." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to confirm script. Please try again.", variant: "destructive" });
    }
  };

  // For ai_find/ig_reel: Save script to Supabase before regenerating
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
      setHasUsedScript(false); // Require Use Script again after regeneration
    }
    handleRegenerateScript();
  };

  // set isPreviewVisible to true when script loaded/generated & inform parent
  useEffect(() => {
    if (!isLoading && script) {
      setIsPreviewVisible(true);
      if (onScriptLoaded) onScriptLoaded(script);
    }
  }, [isLoading, script, onScriptLoaded, setIsPreviewVisible]);

  const showUseScriptButton = scriptOption === 'ai_find' || scriptOption === 'ig_reel';

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
            onUseScript={showUseScriptButton ? handleUseScript : undefined}
            useScriptDisabled={false} // Button always enabled
          />
        </div>
      ))
  );
};

export default ScriptPreview;
