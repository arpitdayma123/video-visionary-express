
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface CustomScriptEditorProps {
  customScript: string;
  wordCount: number;
  isExceedingLimit: boolean;
  isUnderMinimumLimit: boolean;
  isSaving: boolean;
  onCustomScriptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSaveScript: () => void;
}

const CustomScriptEditor: React.FC<CustomScriptEditorProps> = ({
  customScript,
  wordCount,
  isExceedingLimit,
  isUnderMinimumLimit,
  isSaving,
  onCustomScriptChange,
  onSaveScript
}) => {
  const MAX_WORDS = 200;
  
  return (
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
        onChange={onCustomScriptChange}
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
        onClick={onSaveScript} 
        className="mt-4"
        disabled={isExceedingLimit || isUnderMinimumLimit || !customScript.trim() || isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Script'}
      </Button>
    </div>
  );
};

export default CustomScriptEditor;
