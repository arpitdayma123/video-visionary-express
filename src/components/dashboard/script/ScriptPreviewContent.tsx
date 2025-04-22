
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
}

const ScriptPreviewContent: React.FC<ScriptPreviewContentProps> = ({
  isLoading,
  script,
  wordCount,
  onScriptChange,
  onRegenerateScript,
}) => {
  // Add handler for the textarea to stop propagation
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onScriptChange(e);
  };
  
  // Safe click handler for the container
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Safe handler for regenerate button click
  const handleRegenerateClick = (e: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onRegenerateScript(e);
  };

  return (
    <div className="mt-6 space-y-4" onClick={handleContainerClick}>
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="script-preview" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
            Script Preview ({wordCount} words)
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
          <Textarea
            id="script-preview"
            placeholder="Your generated script will appear here..."
            value={script}
            onChange={handleTextareaChange}
            className="h-48 resize-none"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-4" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          onClick={handleRegenerateClick}
          disabled={isLoading}
          type="button"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            'Regenerate Script'
          )}
        </Button>
      </div>
    </div>
  );
};

export default ScriptPreviewContent;
