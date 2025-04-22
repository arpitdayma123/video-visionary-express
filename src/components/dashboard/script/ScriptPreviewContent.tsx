
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface ScriptPreviewContentProps {
  isLoading: boolean;
  script: string;
  wordCount: number;
  onScriptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onRegenerateScript: (e: React.MouseEvent) => void;
  scriptOption: string;
}

const ScriptPreviewContent: React.FC<ScriptPreviewContentProps> = ({
  isLoading,
  script,
  wordCount,
  onScriptChange,
  onRegenerateScript,
  scriptOption
}) => {
  const handleTextareaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    onScriptChange(e);
  };

  const isExceedingLimit = wordCount > 200;
  const isUnderMinimumLimit = wordCount > 0 && wordCount < 30;

  return (
    <div className="mt-6 space-y-4" onClick={(e) => e.stopPropagation()}>
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="script-preview" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
            {scriptOption === 'ai_remake' ? 'Your Script' : 'Script Preview'} ({wordCount} words)
          </label>
        </div>
        {isLoading ? (
          <div className="relative">
            <Skeleton className="h-48 w-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        ) : (
          <>
            <Textarea
              id="script-preview"
              placeholder={scriptOption === 'ai_remake' ? "Enter your script here..." : "Your generated script will appear here..."}
              value={script}
              onChange={handleTextareaChange}
              onClick={handleTextareaClick}
              className={`h-48 resize-none ${(isExceedingLimit || isUnderMinimumLimit) && scriptOption === 'ai_remake' ? 'border-destructive' : ''}`}
            />
            {scriptOption === 'ai_remake' && (isExceedingLimit || isUnderMinimumLimit) && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {isExceedingLimit ? 'Word limit exceeded' : 'Minimum word limit'}
                </AlertTitle>
                <AlertDescription>
                  {isExceedingLimit 
                    ? 'Please reduce your script to 200 words or fewer.'
                    : 'Your script must be at least 30 words long.'}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
      {(!isExceedingLimit && !isUnderMinimumLimit || scriptOption !== 'ai_remake') && (
        <div className="flex flex-wrap gap-4">
          <Button
            variant="outline"
            onClick={onRegenerateScript}
            disabled={isLoading || (scriptOption === 'ai_remake' && (!script.trim() || isExceedingLimit || isUnderMinimumLimit))}
            type="button"
          >
            {isLoading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                {scriptOption === 'ai_remake' ? 'Generating...' : 'Regenerating...'}
              </>
            ) : (
              scriptOption === 'ai_remake' ? 'Generate Script' : 'Regenerate Script'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ScriptPreviewContent;
