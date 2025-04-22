
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
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript
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
    handleRegenerateScript
  } = useScriptPreview(user, onUseScript, scriptOption);

  // Reset preview visibility when script option changes
  useEffect(() => {
    setIsPreviewVisible(scriptOption !== 'ai_remake');
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

  return (
    <div onClick={preventPropagation}>
      {(!isPreviewVisible && scriptOption !== 'ai_remake') ? (
        <GeneratePreviewButton
          isLoading={isLoading}
          onGenerate={handleStartGeneration}
          scriptOption={scriptOption}
          generationStartTime={generationStartTime}
          waitTimeExpired={waitTimeExpired}
        />
      ) : (
        <ScriptPreviewContent
          isLoading={isLoading}
          script={script}
          wordCount={wordCount}
          onScriptChange={handleScriptChange}
          onRegenerateScript={handleRegenerate}
          scriptOption={scriptOption}
        />
      )}
    </div>
  );
};

export default ScriptPreview;
