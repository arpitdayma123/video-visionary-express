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
  onScriptLoaded?: () => void;
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
    handleRegenerateScript
  } = useScriptPreview(user, onUseScript, scriptOption);

  // Reset preview visibility when script option changes, but show immediately for ai_remake
  useEffect(() => {
    setIsPreviewVisible(scriptOption === 'ai_remake');
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

  useEffect(() => {
    if (!isLoading && script && onScriptLoaded) {
      onScriptLoaded();
    }
  }, [isLoading, script, onScriptLoaded]);

  // For ai_remake, always show the preview content
  if (scriptOption === 'ai_remake') {
    return (
      <div onClick={preventPropagation}>
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

  // For other options, keep the existing conditional rendering
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
        onRegenerateScript={handleRegenerateScript}
      />
    </div>
  );
};

export default ScriptPreview;
