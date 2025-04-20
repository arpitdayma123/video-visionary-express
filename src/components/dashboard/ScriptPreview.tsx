
import React from 'react';
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

  if (!isPreviewVisible) {
    return (
      <GeneratePreviewButton
        isLoading={isLoading}
        onGenerate={handleGeneratePreview}
        scriptOption={scriptOption}
      />
    );
  }

  return (
    <ScriptPreviewContent
      isLoading={isLoading}
      script={script}
      wordCount={wordCount}
      onScriptChange={handleScriptChange}
      onUseScript={scriptOption === 'custom' ? handleSaveCustomScript : handleUseScript}
      onRegenerateScript={handleRegenerateScript}
      buttonText={scriptOption === 'custom' ? 'Save Script' : 'Use This Script'}
    />
  );
};

export default ScriptPreview;
