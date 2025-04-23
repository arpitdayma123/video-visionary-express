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

  // "hasUsedScript" tracks whether user has finalized/confirmed the script using the button
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
    // Log visibility status after setting
    console.log('ScriptPreview - Initial visibility set:', { 
      scriptOption, 
      isVisible: scriptOption === 'ai_remake'
    });
  }, [scriptOption, setIsPreviewVisible]);

  // This handles saving current script (from preview) to Supabase and confirming selection.
  const handleUseScript = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      await saveFinalScript(user, script);
      setHasUsedScript(true);
      if (onUseScript) onUseScript(script); // pass for parent state
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
    }
    setHasUsedScript(false); // Require user to explicitly Use Script again after regeneration
    handleRegenerateScript();
  };

  // Wrapper to track generation start time and save script if needed
  const handleStartGeneration = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // First save the script to custom_script if in ai_remake mode
      if (scriptOption === 'ai_remake' && user) {
        // Fetch the current script from the hook
        const { data, error } = await supabase
          .from('profiles')
          .select('custom_script')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching script before generation:', error);
          toast({
            title: "Error",
            description: "Failed to load your script. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        // Use the fetched script for generation
        console.log('Current script before generation:', data.custom_script);
      }
      
      // Continue with normal generation flow
      setGenerationStartTime(Date.now());
      setWaitTimeExpired(false);
      handleGeneratePreview();
    } catch (error) {
      console.error('Error in handleStartGeneration:', error);
      toast({
        title: "Error",
        description: "Failed to start generating preview. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Prevent event bubbling for the entire component
  const preventPropagation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // set isPreviewVisible to true when script loaded/generated & inform parent
  useEffect(() => {
    if (!isLoading && script) {
      setIsPreviewVisible(true);
      if (onScriptLoaded) onScriptLoaded(script); // handoff script upward
    }
  }, [isLoading, script, onScriptLoaded, setIsPreviewVisible]);

  // For ai_find/ig_reel: show "Use This Script", show "Change Script" for ai_find, etc
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
            useScriptDisabled={hasUsedScript}
          />
        </div>
      ))
  );
};

export default ScriptPreview;
