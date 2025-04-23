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
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript,
  onScriptLoaded
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

  // Critical: Set isPreviewVisible to true when a script is successfully loaded
  useEffect(() => {
    if (!isLoading && script) {
      setIsPreviewVisible(true);
      if (onScriptLoaded) {
        onScriptLoaded(script); // Pass loaded/generated script back to parent
      }
    }
  }, [isLoading, script, onScriptLoaded, setIsPreviewVisible]);

  // Pass showChangeScript for ai_find option only
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
          />
        </div>
      ))
  );
};

export default ScriptPreview;
