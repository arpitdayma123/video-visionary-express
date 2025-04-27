import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import ScriptOptions from './script/ScriptOptions';
import CustomScriptSection from './script/CustomScriptSection';
import ReelSection from './script/ReelSection';
import ScriptPreview from './ScriptPreview';
import ScriptSelectionWrapper from './ScriptSelectionWrapper';
import ScriptSectionHeader from './script/ScriptSectionHeader';
import ScriptWebhookError from './script/ScriptWebhookError';
import PromptSection from './script/PromptSection';

interface ScriptSelectionProps {
  scriptOption: string;
  customScript: string;
  setScriptOption: (option: string) => void;
  setCustomScript: (script: string) => void;
  updateProfile: (updates: any) => Promise<void>;
  onScriptConfirmed?: (script: string) => void;
  onScriptPreviewVisible?: (visible: boolean, scriptValue?: string) => void;
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
  // New: track the generated script from the preview (needed for handoff to parent)
  const [latestPreviewScript, setLatestPreviewScript] = useState('');

  // New: track state for preview visibility (for ai_find, ig_reel)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // NEW: track finalized status for script preview handoff
  const [hasFinalizedScript, setHasFinalizedScript] = useState(false);

  // [ADD] State hook for webhook error
  const [webhookError, setWebhookError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState('');

  // Effect: inform parent when preview visibility changes (for ai_find, ig_reel only)
  useEffect(() => {
    if (
      (scriptOption === 'ai_find' || scriptOption === 'ig_reel') &&
      typeof onScriptPreviewVisible === 'function'
    ) {
      onScriptPreviewVisible(isPreviewVisible, latestPreviewScript);
    } else if (typeof onScriptPreviewVisible === 'function') {
      onScriptPreviewVisible(true, customScript);
    }
  // Only depend on relevant state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewVisible, latestPreviewScript, scriptOption, customScript, onScriptPreviewVisible]);

  // Reset preview visibility when switching script options
  useEffect(() => {
    // Reset preview visibility when switching to ai_find or ig_reel
    if (scriptOption === 'ai_find' || scriptOption === 'ig_reel') {
      setIsPreviewVisible(false);
      if (typeof onScriptPreviewVisible === 'function') {
        onScriptPreviewVisible(false, latestPreviewScript);
      }
    }
    
    // Always show custom editor for ig_reel, otherwise reset to true on option change
    setShowCustomEditor(scriptOption === 'ig_reel' ? true : true);
  }, [scriptOption, onScriptPreviewVisible, latestPreviewScript]);

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

  // Modified to handle IG Reel special case
  const handleScriptLoaded = (scriptValue?: string) => {
    // Only hide custom editor for non-ig_reel options
    if (scriptOption !== 'ig_reel') {
      setShowCustomEditor(false);
    }
    setIsPreviewVisible(true);
    if ((scriptOption === 'ai_find' || scriptOption === 'ig_reel') && scriptValue) {
      setLatestPreviewScript(scriptValue);
      if (typeof onScriptPreviewVisible === "function") {
        onScriptPreviewVisible(true, scriptValue);
      }
    }
  };

  // Callback so that finalization state stays in sync with "Use This Script" button
  const handleScriptConfirmedLocal = (script: string) => {
    setHasFinalizedScript(true); // Always true after at least one click for ai_find/ig_reel
    if ((scriptOption === 'ai_find' || scriptOption === 'ig_reel')) {
      setLatestPreviewScript(script);
      if (typeof onScriptConfirmed === 'function') {
        onScriptConfirmed(script);
      }
    } else {
      if (typeof onScriptConfirmed === 'function') {
        onScriptConfirmed(script);
      }
    }
  };

  // [CHANGED] Track webhook error from child ScriptPreview
  // Capture and forward error state using a wrapper function
  const handleScriptPreviewError = (err?: string | null) => {
    setWebhookError(err ?? null);
  };

  const handleUserQueryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setUserQuery(query);
    
    try {
      await updateProfile({ user_query: query });
    } catch (error) {
      console.error('Error saving user query:', error);
      toast({
        title: "Error",
        description: "Failed to save your query. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Pass-through callback: set error state from ScriptPreview hook results
  const ScriptPreviewWithWebhookError = (props: any) => (
    <ScriptPreview {...props} onWebhookError={handleScriptPreviewError} />
  );

  return (
    <ScriptSelectionWrapper handlePreventPropagation={(e) => e.stopPropagation()}>
      <ScriptSectionHeader />

      <ScriptOptions
        scriptOption={scriptOption}
        onScriptOptionChange={handleScriptOptionChange}
      />

      {webhookError && (
        <ScriptWebhookError error={webhookError} />
      )}

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

      {scriptOption === 'script_from_prompt' && (
        <PromptSection
          userQuery={userQuery}
          onQueryChange={handleUserQueryChange}
          isSaving={isSaving}
        />
      )}

      {scriptOption && scriptOption !== 'custom' && (
        <ScriptPreview
          scriptOption={scriptOption}
          onUseScript={handleScriptConfirmedLocal}
          onScriptLoaded={() => handleScriptLoaded(latestPreviewScript)}
          webhookError={webhookError}
          setWebhookError={setWebhookError}
        />
      )}
    </ScriptSelectionWrapper>
  );
};

export default ScriptSelection;
