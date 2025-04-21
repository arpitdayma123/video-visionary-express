
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

  // Check if wait time has expired based on script option
  React.useEffect(() => {
    if (!isLoading || !generationStartTime) {
      setWaitTimeExpired(false);
      return;
    }

    let waitTime = 180000; // Default 3 minutes in ms
    if (scriptOption === 'ai_remake') {
      waitTime = 30000; // 30 seconds for AI remake
    } else if (scriptOption === 'ig_reel') {
      waitTime = 60000; // 1 minute for Instagram reel
    }

    const checkTimeout = () => {
      const now = Date.now();
      const elapsed = now - generationStartTime;
      
      if (elapsed > waitTime) {
        setWaitTimeExpired(true);
        // Check again in 2 minutes (120000ms)
        setTimeout(checkTimeout, 120000);
      } else {
        // Check again when the wait time expires
        const remainingTime = waitTime - elapsed;
        setTimeout(checkTimeout, remainingTime);
      }
    };

    const timeoutId = setTimeout(checkTimeout, waitTime);
    return () => clearTimeout(timeoutId);
  }, [isLoading, generationStartTime, scriptOption]);

  // Wrapper to track generation start time
  const handleStartGeneration = () => {
    setGenerationStartTime(Date.now());
    handleGeneratePreview();
  };

  // Wrapper to track regeneration start time
  const handleStartRegeneration = () => {
    setGenerationStartTime(Date.now());
    handleRegenerateScript();
  };

  // Add this wrapper to prevent event propagation
  const useScriptHandler = (scriptText: string) => {
    // Call the appropriate handler based on the script option
    if (scriptOption === 'custom') {
      handleSaveCustomScript(scriptText);
    } else {
      handleUseScript(scriptText);
      setScriptUsed(true);
    }
  };

  if (!isPreviewVisible) {
    return (
      // Added onClick handler to prevent event bubbling
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
    // Added onClick handler to prevent event bubbling
    <div onClick={(e) => e.stopPropagation()}>
      <ScriptPreviewContent
        isLoading={isLoading}
        script={script}
        wordCount={wordCount}
        onScriptChange={handleScriptChange}
        onUseScript={useScriptHandler}
        onRegenerateScript={handleStartRegeneration}
        buttonText={scriptOption === 'custom' ? 'Save Script' : 'Use This Script'}
        scriptUsed={scriptUsed}
      />
    </div>
  );
};

export default ScriptPreview;
