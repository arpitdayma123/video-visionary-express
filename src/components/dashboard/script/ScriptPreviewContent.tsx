
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader } from 'lucide-react';

interface ScriptPreviewContentProps {
  isLoading: boolean;
  script: string;
  wordCount: number;
  onScriptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onUseScript: (script: string) => void;
  onRegenerateScript: () => void;
}

const ScriptPreviewContent: React.FC<ScriptPreviewContentProps> = ({
  isLoading,
  script,
  wordCount,
  onScriptChange,
  onUseScript,
  onRegenerateScript
}) => {
  // Add this handler to prevent event propagation
  const handleUseScriptClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop the event from bubbling up to the form
    onUseScript(script);
  };

  // Similarly, prevent propagation for regenerate button
  const handleRegenerateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRegenerateScript();
  };

  return (
    <Card className="mt-6 p-6 animate-fade-in">
      <h3 className="text-lg font-medium mb-4">Script Preview</h3>
      
      <div className="space-y-4">
        <div className="relative">
          {isLoading ? (
            <div className="min-h-[200px] flex items-center justify-center bg-muted rounded-md">
              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Textarea
              value={script}
              onChange={onScriptChange}
              placeholder="Your script will appear here..."
              className="min-h-[200px] resize-y font-mono text-sm"
            />
          )}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {wordCount} words
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleUseScriptClick}
            disabled={!script.trim() || isLoading}
            type="button" // Explicitly set type to button to prevent form submission
          >
            Use This Script
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRegenerateClick}
            disabled={isLoading}
            type="button" // Explicitly set type to button
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
    </Card>
  );
};

export default ScriptPreviewContent;
