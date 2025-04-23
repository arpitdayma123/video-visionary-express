
import React from 'react';
import { useUser } from '@/hooks/useUser';
import { useScriptPreview } from '@/hooks/useScriptPreview';
import ScriptPreviewContent from './script/ScriptPreviewContent';
import { useAiRemake } from '@/hooks/script/useAiRemake';

interface ScriptPreviewProps {
  scriptOption: string;
  onUseScript?: (script: string) => void;
  onScriptLoaded?: () => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript,
  onScriptLoaded
}) => {
  const { user } = useUser();

  // Special handling for AI Remake option
  if (scriptOption === 'ai_remake') {
    return <AiRemakeScriptPreview 
      onUseScript={onUseScript} 
      onScriptLoaded={onScriptLoaded} 
    />;
  }

  // For other script options, use existing script preview logic
  const {
    isLoading,
    script,
    wordCount,
    isPreviewVisible,
    handleScriptChange,
    handleGeneratePreview,
    handleRegenerateScript,
    handleChangeScript,
  } = useScriptPreview(
    user, 
    (generatedScript) => {
      // Optional: handle script generation callback
      if (onScriptLoaded) onScriptLoaded();
    }, 
    scriptOption
  );

  return (
    <ScriptPreviewContent
      isLoading={isLoading}
      script={script}
      wordCount={wordCount}
      onScriptChange={handleScriptChange}
      onRegenerateScript={handleRegenerateScript}
      showUseScriptButton={true}
      onUseScript={() => onUseScript && onUseScript(script)}
    />
  );
};

const AiRemakeScriptPreview: React.FC<{
  onUseScript?: (script: string) => void;
  onScriptLoaded?: () => void;
}> = ({ onUseScript, onScriptLoaded }) => {
  const { user } = useUser();

  const {
    isLoading,
    script,
    wordCount,
    isScriptConfirmed,
    handleScriptChange,
    handleRegenerateScript,
    handleUseScript
  } = useAiRemake(
    user, 
    (generatedScript) => {
      if (onScriptLoaded) onScriptLoaded();
    },
    onUseScript
  );

  return (
    <ScriptPreviewContent
      isLoading={isLoading}
      script={script}
      wordCount={wordCount}
      onScriptChange={handleScriptChange}
      onRegenerateScript={handleRegenerateScript}
      showUseScriptButton={true}
      onUseScript={() => {
        handleUseScript();
        if (onUseScript) onUseScript(script);
      }}
      useScriptDisabled={isScriptConfirmed}
    />
  );
};

export default ScriptPreview;
