
import React from 'react';
import CustomScriptEditor from './CustomScriptEditor';

interface CustomScriptSectionProps {
  customScript: string;
  wordCount: number;
  isExceedingLimit: boolean;
  isUnderMinimumLimit: boolean;
  isSaving: boolean;
  scriptOption: string;
  onCustomScriptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSaveScript: () => void;
}

const CustomScriptSection: React.FC<CustomScriptSectionProps> = ({
  customScript,
  wordCount,
  isExceedingLimit,
  isUnderMinimumLimit,
  isSaving,
  scriptOption,
  onCustomScriptChange,
  onSaveScript
}) => {
  if (scriptOption !== 'custom') return null;

  return (
    <CustomScriptEditor
      customScript={customScript}
      wordCount={wordCount}
      isExceedingLimit={isExceedingLimit}
      isUnderMinimumLimit={isUnderMinimumLimit}
      isSaving={isSaving}
      scriptOption={scriptOption}
      onCustomScriptChange={onCustomScriptChange}
      onSaveScript={onSaveScript}
    />
  );
};

export default CustomScriptSection;
