import React, { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Instagram } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import ScriptPreview from './ScriptPreview';

interface ScriptSelectionProps {
  scriptOption: string;
  customScript: string;
  setScriptOption: (option: string) => void;
  setCustomScript: (script: string) => void;
  updateProfile: (updates: any) => Promise<void>;
}

const ScriptSelection = ({
  scriptOption,
  customScript,
  setScriptOption,
  setCustomScript,
  updateProfile
}: ScriptSelectionProps) => {
  const [wordCount, setWordCount] = useState(0);
  const [isExceedingLimit, setIsExceedingLimit] = useState(false);
  const [isUnderMinimumLimit, setIsUnderMinimumLimit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reelUrl, setReelUrl] = useState('');
  const [isValidReelUrl, setIsValidReelUrl] = useState(true);
  const { toast } = useToast();
  const MAX_WORDS = 200;
  const MIN_WORDS = 30;
  const [saveUrlTimeout, setSaveUrlTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Calculate word count whenever customScript changes
    const words = customScript.trim() ? customScript.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setIsExceedingLimit(words > MAX_WORDS);
    setIsUnderMinimumLimit(words > 0 && words < MIN_WORDS);
  }, [customScript]);

  const handleScriptOptionChange = (value: string) => {
    setScriptOption(value);
    updateProfile({ script_option: value });
  };

  const handleCustomScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomScript(e.target.value);
    // Don't update profile on every keystroke to avoid excessive database calls
  };

  const validateInstagramReelUrl = (url: string) => {
    // Basic validation for Instagram reel URLs
    const instagramPattern = /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/i;
    return instagramPattern.test(url);
  };

  const handleReelUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setReelUrl(url);
    const isValid = url === '' || validateInstagramReelUrl(url);
    setIsValidReelUrl(isValid);
    
    // Clear any existing timeout
    if (saveUrlTimeout) {
      clearTimeout(saveUrlTimeout);
    }
    
    // Only auto-save if URL is valid and not empty
    if (url && isValid) {
      // Set a new timeout to save after 500ms of no typing
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
      // Only update the script in the database, without triggering any webhook
      await updateProfile({ custom_script: customScript });
      
      toast({
        title: "Script saved",
        description: "Your script has been saved successfully.",
      });
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
    handleSaveScript();
  };

  return (
    <section className="animate-fade-in border-b border-border pb-8 mb-8">
      <h2 className="text-xl font-medium mb-4">Script Selection</h2>
      
      <RadioGroup 
        value={scriptOption} 
        onValueChange={handleScriptOptionChange}
        className="space-y-4"
      >
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="ai_find" id="ai_find" />
          <div className="grid gap-1.5">
            <Label htmlFor="ai_find" className="font-medium">Let our AI find viral script</Label>
            <p className="text-sm text-muted-foreground">Our AI will analyze trending content and create a viral script for you</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="custom" id="custom" />
          <div className="grid gap-1.5">
            <Label htmlFor="custom" className="font-medium">Use your own script</Label>
            <p className="text-sm text-muted-foreground">Write your own script for the video (limit: 200 words)</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="ai_remake" id="ai_remake" />
          <div className="grid gap-1.5">
            <Label htmlFor="ai_remake" className="font-medium">Let our AI remake your script</Label>
            <p className="text-sm text-muted-foreground">Provide a script and our AI will enhance it for better engagement</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <RadioGroupItem value="ig_reel" id="ig_reel" />
          <div className="grid gap-1.5">
            <Label htmlFor="ig_reel" className="font-medium">Recreate Instagram Reel</Label>
            <p className="text-sm text-muted-foreground">Provide an Instagram reel URL to recreate its content</p>
          </div>
        </div>
      </RadioGroup>
      
      {(scriptOption === 'custom' || scriptOption === 'ai_remake') && (
        <div className="mt-6 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="custom-script" className="font-medium">Your Script</Label>
            <span className={`text-xs ${isExceedingLimit || isUnderMinimumLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {wordCount}/{MAX_WORDS} words
            </span>
          </div>
          
          <Textarea
            id="custom-script"
            placeholder="Enter your script here..."
            value={customScript}
            onChange={handleCustomScriptChange}
            className={`h-32 ${isExceedingLimit || isUnderMinimumLimit ? 'border-destructive' : ''}`}
          />
          
          {isExceedingLimit && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Word limit exceeded</AlertTitle>
              <AlertDescription>
                Please reduce your script to 200 words or fewer.
              </AlertDescription>
            </Alert>
          )}

          {isUnderMinimumLimit && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Minimum word limit</AlertTitle>
              <AlertDescription>
                Your script must be at least 30 words long.
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleSaveScript} 
            className="mt-4"
            disabled={isExceedingLimit || isUnderMinimumLimit || !customScript.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Script'}
          </Button>
        </div>
      )}

      {scriptOption === 'ig_reel' && (
        <div className="mt-6 animate-fade-in">
          <div className="flex items-center mb-2">
            <Instagram className="h-5 w-5 mr-2 text-pink-500" />
            <Label htmlFor="reel-url" className="font-medium">Instagram Reel URL</Label>
            {isSaving && <span className="ml-2 text-xs text-muted-foreground">Saving...</span>}
          </div>
          
          <div className="flex flex-col space-y-2">
            <Input
              id="reel-url"
              placeholder="https://www.instagram.com/reel/..."
              value={reelUrl}
              onChange={handleReelUrlChange}
              className={`${!isValidReelUrl ? 'border-destructive' : ''}`}
              type="url"
            />
            
            {!isValidReelUrl && reelUrl && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Invalid Instagram URL</AlertTitle>
                <AlertDescription>
                  Please paste a valid Instagram reel URL (e.g., https://www.instagram.com/reel/ABC123).
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Add Script Preview section */}
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
