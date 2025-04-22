
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
    handleRegenerateScript,
    handleUseScript,
    handleSaveCustomScript
  } = useScriptPreview(user, onUseScript, scriptOption);

  // Reset preview visibility when script option changes
  useEffect(() => {
    setIsPreviewVisible(false);
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

  const handleUseScriptClick = () => {
    handleUseScript(script);
  };

  if (!isPreviewVisible) {
    return (
      <div onClick={preventPropagation}>
        <GeneratePreviewButton
          isLoading={isLoading}
          onGenerate={handleStartGeneration}
          scriptOption={scriptOption}
          generationStartTime={generationStartTime}
          waitTimeExpired={waitTimeExpired}
        />
      </div>
    );
  }

  return (
    <div onClick={preventPropagation}>
      <ScriptPreviewContent
        isLoading={isLoading}
        script={script}
        wordCount={wordCount}
        onScriptChange={handleScriptChange}
        onRegenerateScript={handleRegenerate}
        onUseScript={handleUseScriptClick}
      />
    </div>
  );
};

export default ScriptPreview;
