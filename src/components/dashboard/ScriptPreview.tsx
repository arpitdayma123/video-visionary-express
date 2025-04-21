
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useScriptPreview } from '@/hooks/useScriptPreview';
import GeneratePreviewButton from './script/GeneratePreviewButton';
import ScriptPreviewContent from './script/ScriptPreviewContent';

interface ScriptPreviewProps {
  scriptOption: string;
  onUseScript: (script: string) => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript
}) => {
  const { user } = useAuth();
  const [scriptUsed, setScriptUsed] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [waitTimeExpired, setWaitTimeExpired] = useState(false);
  
  const {
    isLoading,
    script,
    wordCount,
    isPreviewVisible,
    handleScriptChange,
    handleGeneratePreview,
    handleRegenerateScript,
    handleUseScript,
    handleSaveCustomScript
  } = useScriptPreview(user, onUseScript, scriptOption);

  // Reset scriptUsed when script option changes
  React.useEffect(() => {
    setScriptUsed(false);
  }, [scriptOption]);

  // Handle script usage and editing
  const useScriptHandler = (scriptText: string) => {
    console.log("ScriptPreview: useScriptHandler called with script:", scriptText);
    
    if (scriptOption === 'custom') {
      handleSaveCustomScript(scriptText);
    } else {
      handleUseScript(scriptText);
    }
    
    setScriptUsed(true); // Set script as used regardless of edits
  };

  // Handle regenerate with the same pattern as generate preview
  const handleRegenerate = () => {
    setGenerationStartTime(Date.now());
    setWaitTimeExpired(false);
    handleRegenerateScript();
  };

  // Wrapper to track generation start time
  const handleStartGeneration = () => {
    setGenerationStartTime(Date.now());
    setWaitTimeExpired(false);
    handleGeneratePreview();
  };

  if (!isPreviewVisible) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
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
    <div onClick={(e) => e.stopPropagation()}>
      <ScriptPreviewContent
        isLoading={isLoading}
        script={script}
        wordCount={wordCount}
        onScriptChange={handleScriptChange}
        onUseScript={useScriptHandler}
        onRegenerateScript={handleRegenerate}
        buttonText={scriptOption === 'custom' ? 'Save Script' : 'Use This Script'}
        scriptUsed={scriptUsed}
      />
    </div>
  );
};

export default ScriptPreview;
