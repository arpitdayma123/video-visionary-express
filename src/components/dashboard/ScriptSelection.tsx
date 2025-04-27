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
  // Track the generated script from the preview
  const [latestPreviewScript, setLatestPreviewScript] = useState('');

  // Track state for preview visibility
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Track finalized status for script preview handoff
  const [hasFinalizedScript, setHasFinalizedScript] = useState(false);

  // State hook for webhook error
  const [webhookError, setWebhookError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState('');

  // Effect: inform parent when preview visibility changes
  useEffect(() => {
    if (
      (scriptOption === 'ai_find' || scriptOption === 'ig_reel' || scriptOption === 'script_from_prompt') &&
      typeof onScriptPreviewVisible === 'function'
    ) {
      onScriptPreviewVisible(isPreviewVisible, latestPreviewScript);
    } else if (typeof onScriptPreviewVisible === 'function') {
      onScriptPreviewVisible(true, customScript);
    }
  // Only depend on relevant state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewVisible, latestPreviewScript, scriptOption, customScript, onScriptPreviewVisible]);

  // Enhanced reset when switching script options
  useEffect(() => {
    console.log('ScriptSelection - Script option changed to:', scriptOption);
    
    // Reset preview state for AI-generated script options
    if (scriptOption === 'ai_find' || scriptOption === 'ig_reel' || scriptOption === 'script_from_prompt') {
      setIsPreviewVisible(false);
      setLatestPreviewScript('');
      setHasFinalizedScript(false);
      
      if (typeof onScriptPreviewVisible === 'function') {
        onScriptPreviewVisible(false, '');
      }
    } else if (scriptOption === 'custom') {
      // For custom script, always make form visible
      if (typeof onScriptPreviewVisible === 'function') {
        onScriptPreviewVisible(true, customScript);
      }
    }
    
    // Reset webhook errors
    setWebhookError(null);
    
    // Configure custom editor visibility based on script option
    setShowCustomEditor(scriptOption === 'custom' || scriptOption === 'ai_remake');
  }, [scriptOption, onScriptPreviewVisible, customScript]);

  useEffect(() => {
    const words = customScript.trim() ? customScript.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setIsExceedingLimit(words > 200);
    setIsUnderMinimumLimit(words > 0 && words < MIN_WORDS);
  }, [customScript]);

  // Script option change handler with proper reset
  const handleScriptOptionChangeWithReset = async (value: string) => {
    try {
      // First update the database
      await updateProfile({ script_option: value });
      
      console.log('ScriptSelection - Script option changing to:', value);
      
      // Then reset all related state
      setScriptOption(value);
      setIsPreviewVisible(false);
      setLatestPreviewScript('');
      setHasFinalizedScript(false);
      setWebhookError(null);
      
      // Reset UI state based on the new option
      if (value === 'custom') {
        setShowCustomEditor(true);
        // For custom script, notify parent about preview visibility
        if (typeof onScriptPreviewVisible === 'function') {
          onScriptPreviewVisible(true, customScript);
        }
      } else if (value === 'ai_remake') {
        setShowCustomEditor(true);
        setIsPreviewVisible(true);
      } else {
        setShowCustomEditor(false);
        setIsPreviewVisible(false);
        // For AI options, notify parent about preview visibility (hidden)
        if (typeof onScriptPreviewVisible === 'function') {
          onScriptPreviewVisible(false, '');
        }
      }
      
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

  // Improved script loaded handler with logging
  const handleScriptLoaded = (scriptValue?: string) => {
    console.log('ScriptSelection - Script loaded for option:', scriptOption, 'script value:', !!scriptValue);
    
    // Only hide custom editor for non-custom options
    if (scriptOption !== 'custom') {
      setShowCustomEditor(false);
    }
    
    setIsPreviewVisible(true);
    
    if ((scriptOption === 'ai_find' || scriptOption === 'ig_reel' || scriptOption === 'script_from_prompt') && scriptValue) {
      setLatestPreviewScript(scriptValue);
      
      if (typeof onScriptPreviewVisible === "function") {
        onScriptPreviewVisible(true, scriptValue);
      }
    }
  };

  // Callback for script confirmation
  const handleScriptConfirmedLocal = (script: string) => {
    setHasFinalizedScript(true);
    
    if ((scriptOption === 'ai_find' || scriptOption === 'ig_reel' || scriptOption === 'script_from_prompt')) {
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

  // Track webhook error from ScriptPreview
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

  console.log('ScriptSelection render:', {
    scriptOption,
    isPreviewVisible,
    showCustomEditor,
    hasScript: !!latestPreviewScript
  });

  return (
    <ScriptSelectionWrapper handlePreventPropagation={handlePreventPropagation}>
      <ScriptSectionHeader />

      <ScriptOptions
        scriptOption={scriptOption}
        onScriptOptionChange={handleScriptOptionChangeWithReset}
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

      {scriptOption !== 'custom' && (
        <ScriptPreview
          key={scriptOption} /* Force re-render on option change */
          scriptOption={scriptOption}
          onUseScript={handleScriptConfirmedLocal}
          onScriptLoaded={handleScriptLoaded}
          webhookError={webhookError}
          setWebhookError={setWebhookError}
        />
      )}
    </ScriptSelectionWrapper>
  );
};

export default ScriptSelection;
