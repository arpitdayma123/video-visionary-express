
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader } from 'lucide-react';

interface ScriptPreviewContentProps {
  isLoading: boolean;
  script: string;
  wordCount: number;
  onScriptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onRegenerateScript: (e: React.MouseEvent) => void;
  scriptOption?: string;
}

const ScriptPreviewContent: React.FC<ScriptPreviewContentProps> = ({
  isLoading,
  script,
  wordCount,
  onScriptChange,
  onRegenerateScript,
  scriptOption
}) => {
  // Keep click handlers for propagation control
  const handleTextareaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    onScriptChange(e);
  };

  const isAiRemake = scriptOption === 'ai_remake';
  const MAX_WORDS = 200;
  const MIN_WORDS = 30;
  const currentWordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const isExceedingLimit = currentWordCount > MAX_WORDS;
  const isUnderMinimumLimit = currentWordCount > 0 && currentWordCount < MIN_WORDS;

  return (
    <div className="mt-6 space-y-4" onClick={(e) => e.stopPropagation()}>
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="script-preview" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
            {isAiRemake ? 'Your Script' : `Script Preview (${wordCount} words)`}
          </label>
          {isAiRemake && (
            <span className={`text-xs ${isExceedingLimit || isUnderMinimumLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {currentWordCount}/{MAX_WORDS} words
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="relative">
            <Skeleton className="h-48 w-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        ) : (
          <Textarea
            id="script-preview"
            placeholder={isAiRemake ? "Enter your script here..." : "Your generated script will appear here..."}
            value={script}
            onChange={handleTextareaChange}
            onClick={handleTextareaClick}
            className={`h-48 resize-none ${isAiRemake && (isExceedingLimit || isUnderMinimumLimit) ? 'border-destructive' : ''}`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        <Button
          variant="outline"
          onClick={onRegenerateScript}
          disabled={isLoading || (isAiRemake && (isExceedingLimit || isUnderMinimumLimit || !script.trim()))}
          type="button"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              {isAiRemake ? 'Generating...' : 'Regenerating...'}
            </>
          ) : (
            isAiRemake ? 'Generate Script' : 'Regenerate Script'
          )}
        </Button>
      </div>
    </div>
  );
};

export default ScriptPreviewContent;
