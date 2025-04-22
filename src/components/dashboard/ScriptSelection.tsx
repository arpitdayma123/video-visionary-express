import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import ScriptOptions from './script/ScriptOptions';
import CustomScriptEditor from './script/CustomScriptEditor';
import InstagramReelInput from './script/InstagramReelInput';
import ScriptPreview from './ScriptPreview';

interface ScriptSelectionProps {
  scriptOption: string;
  customScript: string;
  setScriptOption: (option: string) => void;
  setCustomScript: (script: string) => void;
  updateProfile: (updates: any) => Promise<void>;
  onScriptConfirmed?: (script: string) => void;
}

const ScriptSelection: React.FC<ScriptSelectionProps> = ({
  scriptOption,
  customScript,
  setScriptOption,
  setCustomScript,
  updateProfile,
  onScriptConfirmed
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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const words = customScript.trim() ? customScript.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setIsExceedingLimit(words > 200);
    setIsUnderMinimumLimit(words > 0 && words < MIN_WORDS);
  }, [customScript]);

  const handleScriptOptionChange = (value: string) => {
    setScriptOption(value);
    updateProfile({ script_option: value });
  };

  const handleCustomScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomScript(e.target.value);
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
            variant: "destructive"
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
      if (scriptOption === 'ai_remake') {
        // For AI remake, we'll follow the preview generation pattern
        await updateProfile({ preview: 'generating' });
        
        const params = new URLSearchParams({
          userId: userId || '',
          scriptOption: 'ai_remake',
          customScript: customScript
        });
        
        const webhookResponse = await fetch(
          `https://primary-production-ce25.up.railway.app/webhook/scriptfind?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          }
        );

        if (!webhookResponse.ok) {
          throw new Error(`Webhook failed with status ${webhookResponse.status}`);
        }
        
        toast({
          title: "Generating preview",
          description: "Your script is being processed. Please wait...",
        });
      } else {
        // For custom script, just save it
        await updateProfile({ custom_script: customScript });
        await updateProfile({ finalscript: customScript });
        
        if (onScriptConfirmed) {
          onScriptConfirmed(customScript);
        }
        
        toast({
          title: "Script saved",
          description: "Your script has been saved successfully.",
        });
      }
    } catch (error) {
      console.error('Error saving script:', error);
      toast({
        title: "Save failed",
        description: "There was an error saving your script.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseScript = (generatedScript: string) => {
    setCustomScript(generatedScript);
    
    // Notify parent component that script has been confirmed
    if (onScriptConfirmed) {
      onScriptConfirmed(generatedScript);
    }
    
    handleSaveScript();
  };

  return (
    <section className="animate-fade-in border-b border-border pb-8 mb-8">
      <h2 className="text-xl font-medium mb-4">Script Selection</h2>
      
      <ScriptOptions
        scriptOption={scriptOption}
        onScriptOptionChange={handleScriptOptionChange}
      />
      
      {(scriptOption === 'custom' || scriptOption === 'ai_remake') && (
        <CustomScriptEditor
          customScript={customScript}
          wordCount={wordCount}
          isExceedingLimit={isExceedingLimit}
          isUnderMinimumLimit={isUnderMinimumLimit}
          isSaving={isSaving}
          onCustomScriptChange={handleCustomScriptChange}
          onSaveScript={handleSaveScript}
          scriptOption={scriptOption}
        />
      )}

      {scriptOption === 'ig_reel' && (
        <InstagramReelInput
          reelUrl={reelUrl}
          isValidReelUrl={isValidReelUrl}
          isSaving={isSaving}
          onReelUrlChange={handleReelUrlChange}
        />
      )}

      {scriptOption && (
        <ScriptPreview
          scriptOption={scriptOption}
          onUseScript={handleUseScript}
        />
      )}
    </section>
  );
};

export default ScriptSelection;
