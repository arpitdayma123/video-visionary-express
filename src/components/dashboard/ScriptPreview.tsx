
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

  // Add this wrapper to prevent event propagation
  const useScriptHandler = (scriptText: string) => {
    // Call the appropriate handler based on the script option
    if (scriptOption === 'custom') {
      handleSaveCustomScript(scriptText);
    } else {
      handleUseScript(scriptText);
    }
  };

  if (!isPreviewVisible) {
    return (
      // Added onClick handler to prevent event bubbling
      <div onClick={(e) => e.stopPropagation()}>
        <GeneratePreviewButton
          isLoading={isLoading}
          onGenerate={handleGeneratePreview}
          scriptOption={scriptOption}
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
        onRegenerateScript={handleRegenerateScript}
        buttonText={scriptOption === 'custom' ? 'Save Script' : 'Use This Script'}
      />
    </div>
  );
};

export default ScriptPreview;
