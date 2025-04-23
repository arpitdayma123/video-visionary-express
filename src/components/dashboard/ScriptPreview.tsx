
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useScriptPreview } from '@/hooks/useScriptPreview';
import GeneratePreviewButton from './script/GeneratePreviewButton';
import ScriptPreviewContent from './script/ScriptPreviewContent';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScriptPreviewProps {
  scriptOption: string;
  onUseScript: (script: string) => void;
  onScriptLoaded?: (scriptValue?: string) => void; // allow loading script value out
  // NEW (optional): finalizeScript state and setter passed by parent if desired
  onScriptFinalized?: () => void;
  scriptFinalized?: boolean;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript,
  onScriptLoaded,
  onScriptFinalized,
  scriptFinalized = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [waitTimeExpired, setWaitTimeExpired] = useState(false);
  
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

  // Reset preview visibility when script option changes, but show immediately for ai_remake
  useEffect(() => {
    setIsPreviewVisible(scriptOption === 'ai_remake');
    
    // Log visibility status after setting
    console.log('ScriptPreview - Initial visibility set:', { 
      scriptOption, 
      isVisible: scriptOption === 'ai_remake'
    });
  }, [scriptOption, setIsPreviewVisible]);

  // Handle regenerate with the same pattern as generate preview
  const handleRegenerate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGenerationStartTime(Date.now());
    setWaitTimeExpired(false);
    handleRegenerateScript();
  };

  // Wrapper to track generation start time and save script if needed
  const handleStartGeneration = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // For ai_remake, extra load logic. (Kept for compatibility)
      if (scriptOption === 'ai_remake' && user) {
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
      }
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

  // Critical: Set isPreviewVisible to true when a script is successfully loaded
  // And pass the script to parent component
  useEffect(() => {
    if (!isLoading && script) {
      setIsPreviewVisible(true);
      if (onScriptLoaded) {
        onScriptLoaded(script); // Pass loaded/generated script back to parent
      }
    }
  }, [isLoading, script, onScriptLoaded, setIsPreviewVisible]);

  // New: Handle "Use This Script" action for ai_find / ig_reel
  const handleUseScript = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      // Save to finalscript in profiles
      const { error } = await supabase
        .from('profiles')
        .update({ finalscript: script })
        .eq('id', user.id);
      if (error) throw error;

      toast({
        title: "Script Confirmed",
        description: "Your script is ready for video generation.",
      });

      // Inform parent that script has been finalized/confirmed
      if (onScriptFinalized) onScriptFinalized();
      // Also notify script usage upstream
      onUseScript(script);
    } catch (err) {
      console.error("Error saving final script:", err);
      toast({
        title: "Error",
        description: "Failed to save your script. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Pass showChangeScript and showUseScript for ai_find/ig_reel only
  const showUseScript = scriptOption === 'ai_find' || scriptOption === 'ig_reel';

  return (
    scriptOption === 'ai_remake'
      ? (
        <div onClick={preventPropagation}>
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
        <div onClick={preventPropagation}>
          <GeneratePreviewButton
            isLoading={isLoading}
            onGenerate={handleStartGeneration}
            scriptOption={scriptOption}
            generationStartTime={generationStartTime}
            waitTimeExpired={waitTimeExpired}
          />
        </div>
      ) : (
        <div onClick={preventPropagation}>
          <ScriptPreviewContent
            isLoading={isLoading}
            script={script}
            wordCount={wordCount}
            onScriptChange={handleScriptChange}
            onRegenerateScript={(e) => { e.preventDefault(); e.stopPropagation(); handleRegenerateScript(); }}
            showChangeScript={scriptOption === 'ai_find'}
            onChangeScript={
              scriptOption === 'ai_find'
                ? (e) => { e.preventDefault(); e.stopPropagation(); handleChangeScript(); }
                : undefined
            }
            showUseScript={showUseScript}
            onUseScript={showUseScript ? handleUseScript : undefined}
            scriptFinalized={scriptFinalized}
          />
        </div>
      ))
  );
};

export default ScriptPreview;

