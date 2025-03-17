
import React, { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
  const MAX_WORDS = 150;

  useEffect(() => {
    // Calculate word count whenever customScript changes
    const words = customScript.trim() ? customScript.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setIsExceedingLimit(words > MAX_WORDS);
  }, [customScript]);

  const handleScriptOptionChange = (value: string) => {
    setScriptOption(value);
    updateProfile({ script_option: value });
  };

  const handleCustomScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomScript(e.target.value);
    // Don't update profile on every keystroke to avoid excessive database calls
  };

  const handleSaveScript = () => {
    if (!isExceedingLimit) {
      updateProfile({ custom_script: customScript });
    }
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
            <p className="text-sm text-muted-foreground">Write your own script for the video (limit: 150 words)</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="ai_remake" id="ai_remake" />
          <div className="grid gap-1.5">
            <Label htmlFor="ai_remake" className="font-medium">Let our AI remake your script</Label>
            <p className="text-sm text-muted-foreground">Provide a script and our AI will enhance it for better engagement</p>
          </div>
        </div>
      </RadioGroup>
      
      {(scriptOption === 'custom' || scriptOption === 'ai_remake') && (
        <div className="mt-6 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="custom-script" className="font-medium">Your Script</Label>
            <span className={`text-xs ${isExceedingLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {wordCount}/{MAX_WORDS} words
            </span>
          </div>
          
          <Textarea
            id="custom-script"
            placeholder="Enter your script here..."
            value={customScript}
            onChange={handleCustomScriptChange}
            className={`h-32 ${isExceedingLimit ? 'border-destructive' : ''}`}
          />
          
          {isExceedingLimit && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Word limit exceeded</AlertTitle>
              <AlertDescription>
                Please reduce your script to 150 words or fewer.
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleSaveScript} 
            className="mt-4"
            disabled={isExceedingLimit || !customScript.trim()}
          >
            Save Script
          </Button>
        </div>
      )}
    </section>
  );
};

export default ScriptSelection;
