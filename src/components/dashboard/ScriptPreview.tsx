
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useScriptPreview } from '@/hooks/useScriptPreview';
import GeneratePreviewButton from './script/GeneratePreviewButton';
import ScriptPreviewContent from './script/ScriptPreviewContent';

interface ScriptPreviewProps {
  scriptOption: string;
  onUseScript: (script: string) => void;
  onGeneratePreview?: () => Promise<void>;
  customScript?: string;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript,
  onGeneratePreview,
  customScript
}) => {
  const { user } = useAuth();
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [waitTimeExpired, setWaitTimeExpired] = useState(false);
  
  const {
    isLoading,
    script,
    wordCount,
    isPreviewVisible,
    handleScriptChange,
    handleGeneratePreview: internalHandleGeneratePreview,
    handleRegenerateScript,
    handleUseScript,
    handleSaveCustomScript
  } = useScriptPreview(user, onUseScript, scriptOption);

  // Handle regenerate with the same pattern as generate preview
  const handleRegenerate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGenerationStartTime(Date.now());
    setWaitTimeExpired(false);
    handleRegenerateScript();
  };

  // Wrapper to track generation start time
  const handleStartGeneration = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGenerationStartTime(Date.now());
    setWaitTimeExpired(false);
    
    // Use the parent component's generate preview function for ai_remake
    if (scriptOption === 'ai_remake' && onGeneratePreview) {
      onGeneratePreview();
    } else {
      internalHandleGeneratePreview();
    }
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
          customScript={customScript}
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
        onRegenerateScript={handleRegenerate}
      />
    </div>
  );
};

export default ScriptPreview;
