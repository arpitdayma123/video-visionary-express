import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ScriptPreviewContentProps {
  isLoading: boolean;
  script: string;
  wordCount: number;
  onScriptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onUseScript: (script: string) => void;
  onRegenerateScript: () => void;
  buttonText?: string;
}

const ScriptPreviewContent: React.FC<ScriptPreviewContentProps> = ({
  isLoading,
  script,
  wordCount,
  onScriptChange,
  onUseScript,
  onRegenerateScript,
  buttonText = 'Use This Script'
}) => {
  return (
    <div className="mt-6 space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="script-preview" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
            Script Preview ({wordCount} words)
          </label>
        </div>
        <Textarea
          id="script-preview"
          placeholder="Your generated script will appear here..."
          value={script}
          onChange={onScriptChange}
          className="h-48 resize-none"
          disabled={isLoading}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={() => onUseScript(script)}
          disabled={isLoading}
        >
          {buttonText}
        </Button>
        <Button
          variant="outline"
          onClick={onRegenerateScript}
          disabled={isLoading}
        >
          Regenerate Script
        </Button>
      </div>
    </div>
  );
};

export default ScriptPreviewContent;
