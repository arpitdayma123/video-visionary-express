import React, { useState, useEffect } from 'react';
import { useScriptPreview } from '@/hooks/useScriptPreview';
import GeneratePreviewButton from './script/GeneratePreviewButton';
import ScriptPreviewContent from './script/ScriptPreviewContent';

interface ScriptPreviewProps {
  scriptOption: string;
  onUseScript: (script: string) => void;
  onScriptConfirmed?: (script: string) => Promise<void>;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({ 
  scriptOption, 
  onUseScript,
  onScriptConfirmed 
}) => {
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
  } = useScriptPreview(onUseScript, scriptOption);

  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [waitTimeExpired, setWaitTimeExpired] = useState(false);

  useEffect(() => {
    if (isLoading && !generationStartTime) {
      setGenerationStartTime(Date.now());
      setWaitTimeExpired(false);
    } else if (!isLoading) {
      setGenerationStartTime(null);
      setWaitTimeExpired(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (generationStartTime) {
      const checkInterval = setInterval(() => {
        if (Date.now() - generationStartTime > 180000) { // 3 minutes
          setWaitTimeExpired(true);
          clearInterval(checkInterval);
        }
      }, 60000); // Check every minute

      return () => clearInterval(checkInterval);
    }
  }, [generationStartTime]);

  const handleGeneratePreviewWrapper = async () => {
    if (scriptOption === 'ai_remake' && onScriptConfirmed) {
      await onScriptConfirmed(script);
    }
    handleGeneratePreview();
  };

  return (
    <div className="mt-4 animate-fade-in">
      {scriptOption !== 'custom' && (
        <GeneratePreviewButton
          isLoading={isLoading}
          onGenerate={handleGeneratePreviewWrapper}
          scriptOption={scriptOption}
          generationStartTime={generationStartTime}
          waitTimeExpired={waitTimeExpired}
        />
      )}

      {isPreviewVisible && (
        <ScriptPreviewContent
          isLoading={isLoading}
          script={script}
          wordCount={wordCount}
          onScriptChange={handleScriptChange}
          onRegenerateScript={handleRegenerateScript}
        />
      )}
    </div>
  );
};

export default ScriptPreview;
