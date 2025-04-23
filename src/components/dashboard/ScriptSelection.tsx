import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import ScriptOptions from './script/ScriptOptions';
import CustomScriptSection from './script/CustomScriptSection';
import ReelSection from './script/ReelSection';
import ScriptPreview from './ScriptPreview';
import ScriptSelectionWrapper from './script/ScriptSelectionWrapper';
import ScriptSectionHeader from './script/ScriptSectionHeader';

interface ScriptSelectionProps {
  scriptOption: string;
  customScript: string;
  setScriptOption: (option: string) => void;
  setCustomScript: (script: string) => void;
  updateProfile: (updates: any) => Promise<void>;
  onScriptConfirmed?: (script: string) => void;
  // Add new prop for letting parent know about preview visibility
  onScriptPreviewVisible?: (visible: boolean) => void;
}

const ScriptSelection: React.FC<ScriptSelectionProps> = ({
  scriptOption,
  customScript,
  setScriptOption,
  setCustomScript,
  updateProfile,
  onScriptConfirmed,
  onScriptPreviewVisible
}) => {
  const [wordCount, setWordCount] = useState(0);
  const [isExceedingLimit, setIsExceedingLimit] = useState(false);
  const [isUnderMinimumLimit, setIsUnderMinimumLimit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reelUrl, setReelUrl] = useState('');
  const [isValidReelUrl, setIsValidReelUrl] = useState(true);
  const { toast } = useToast();
  const MIN_WORDS = 30;
  const [saveUrlTimeout, setSaveUrlTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showCustomEditor, setShowCustomEditor] = useState(true);

  // New: track state for preview visibility (for ai_find, ig_reel)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Effect: inform parent when preview visibility changes (for ai_find, ig_reel only)
  useEffect(() => {
    if (
      (scriptOption === 'ai_find' || scriptOption === 'ig_reel') &&
      typeof onScriptPreviewVisible === 'function'
    ) {
      onScriptPreviewVisible(isPreviewVisible);
    } else if (typeof onScriptPreviewVisible === 'function') {
      onScriptPreviewVisible(true); // Always "enabled" for other types
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewVisible, scriptOption]);

  // Effect to handle script option changes
  useEffect(() => {
    setShowCustomEditor(true); // Reset visibility when option changes
  }, [scriptOption]);

  useEffect(() => {
    const words = customScript.trim() ? customScript.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setIsExceedingLimit(words > 200);
    setIsUnderMinimumLimit(words > 0 && words < MIN_WORDS);
  }, [customScript]);

  const handleScriptOptionChange = async (value: string) => {
    try {
      await updateProfile({ script_option: value });
      setScriptOption(value);
    } catch (error) {
      console.error('Error updating script option:', error);
      toast({
        title: "Error",
        description: "Failed to update script option. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCustomScriptChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomScript(e.target.value);
    
    if (scriptOption === 'ai_remake') {
      try {
        await updateProfile({ custom_script: e.target.value });
      } catch (error) {
        console.error('Error saving script:', error);
        toast({
          title: "Save failed",
          description: "There was an error saving your script.",
          variant: "destructive"
        });
      }
    }
  };

  const validateInstagramReelUrl = (url: string) => {
    const instagramPattern = /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/i;
    return instagramPattern.test(url);
  };

  const handleReelUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setReelUrl(url);
    const isValid = url === '' || validateInstagramReelUrl(url);
    setIsValidReelUrl(isValid);
    
    if (saveUrlTimeout) {
      clearTimeout(saveUrlTimeout);
    }
    
    if (url && isValid) {
      const timeout = setTimeout(async () => {
        try {
          setIsSaving(true);
          await updateProfile({ reel_url: url });
          setIsSaving(false);
          
          toast({
            title: "URL saved",
            description: "Instagram reel URL has been saved automatically.",
          });
        } catch (error) {
          console.error('Error saving reel URL:', error);
          setIsSaving(false);
          
          toast({
            title: "Save failed",
            description: "There was an error saving your reel URL.",
          });
        }
      }, 500);
      
      setSaveUrlTimeout(timeout);
    }
  };

  const handleSaveScript = async () => {
    if (isExceedingLimit || isUnderMinimumLimit) return;
    
    setIsSaving(true);
    try {
      await updateProfile({ custom_script: customScript });
      await updateProfile({ finalscript: customScript });
      
      if (onScriptConfirmed) {
        onScriptConfirmed(customScript);
      }
      
      toast({
        title: "Script saved",
        description: "Your script has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving script:', error);
      toast({
        title: "Save failed",
        description: "There was an error saving your script.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreventPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Callback for ScriptPreview to trigger when preview visible
  const handleScriptLoaded = () => {
    setShowCustomEditor(false);
    setIsPreviewVisible(true);
  };

  return (
    <ScriptSelectionWrapper handlePreventPropagation={(e) => e.stopPropagation()}>
      <ScriptSectionHeader />
      
      <ScriptOptions
        scriptOption={scriptOption}
        onScriptOptionChange={handleScriptOptionChange}
      />
      
      {scriptOption === 'custom' && (
        <CustomScriptSection
          customScript={customScript}
          wordCount={wordCount}
          isExceedingLimit={isExceedingLimit}
          isUnderMinimumLimit={isUnderMinimumLimit}
          isSaving={isSaving}
          scriptOption={scriptOption}
          onCustomScriptChange={handleCustomScriptChange}
          onSaveScript={handleSaveScript}
        />
      )}

      {scriptOption === 'ig_reel' && (
        <ReelSection
          reelUrl={reelUrl}
          isValidReelUrl={isValidReelUrl}
          isSaving={isSaving}
          onReelUrlChange={handleReelUrlChange}
        />
      )}

      {/* ScriptPreview: now tracks preview visible for ai_find/ig_reel for button enablement */}
      {scriptOption && scriptOption !== 'custom' && (
        <ScriptPreview
          scriptOption={scriptOption}
          onUseScript={onScriptConfirmed || (() => {})}
          onScriptLoaded={handleScriptLoaded}
        />
      )}
    </ScriptSelectionWrapper>
  );
};

export default ScriptSelection;
