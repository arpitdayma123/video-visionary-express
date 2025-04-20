
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
    handleUseScript
  } = useScriptPreview(user, onUseScript);

  if (!isPreviewVisible) {
    return (
      <GeneratePreviewButton
        isLoading={isLoading}
        onGenerate={handleGeneratePreview}
      />
    );
  }

  return (
    <ScriptPreviewContent
      isLoading={isLoading}
      script={script}
      wordCount={wordCount}
      onScriptChange={handleScriptChange}
      onUseScript={handleUseScript}
      onRegenerateScript={handleRegenerateScript}
    />
  );
};

export default ScriptPreview;
