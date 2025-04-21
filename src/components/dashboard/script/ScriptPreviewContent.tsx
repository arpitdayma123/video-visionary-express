
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ScriptPreviewContentProps {
  isLoading: boolean;
  script: string;
  wordCount: number;
  onScriptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onRegenerateScript: () => void;
}

const ScriptPreviewContent: React.FC<ScriptPreviewContentProps> = ({
  isLoading,
  script,
  wordCount,
  onScriptChange,
  onRegenerateScript,
}) => {
  // Add a handler to explicitly stop regenerate propagation
  const handleRegenerateScript = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRegenerateScript();
  };

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
      <div className="flex flex-wrap gap-4" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          onClick={handleRegenerateScript}
          disabled={isLoading}
          type="button"
        >
          Regenerate Script
        </Button>
      </div>
    </div>
  );
};

export default ScriptPreviewContent;
