
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScriptPreviewContentProps {
  isLoading: boolean;
  script: string;
  wordCount: number;
  onScriptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onRegenerateScript: (e: React.MouseEvent) => void;
  showChangeScript?: boolean;
  onChangeScript?: (e: React.MouseEvent) => void;
  showUseScriptButton?: boolean;
  onUseScript?: (e: React.MouseEvent) => void;
  useScriptDisabled?: boolean;
}

const ScriptPreviewContent: React.FC<ScriptPreviewContentProps> = ({
  isLoading,
  script,
  wordCount,
  onScriptChange,
  onRegenerateScript,
  showChangeScript,
  onChangeScript,
  showUseScriptButton = false,
  onUseScript,
  useScriptDisabled,
}) => {
  const { toast } = useToast();
  const MAX_WORDS = 220;

  // Keep click handlers for propagation control
  const handleTextareaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const newText = e.target.value;
    const words = newText.trim().split(/\s+/).filter(word => word.length > 0);
    
    if (words.length > MAX_WORDS) {
      toast({
        title: "Word limit exceeded",
        description: `Script cannot exceed ${MAX_WORDS} words. Current: ${words.length} words.`,
        variant: "destructive"
      });
      return;
    }
    
    onScriptChange(e);
  };

  return (
    <div className="mt-6 space-y-4" onClick={(e) => e.stopPropagation()}>
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="script-preview" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
            Script Preview ({wordCount} / {MAX_WORDS} words)
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
            onClick={handleTextareaClick}
            className={`h-48 resize-none ${wordCount > MAX_WORDS ? 'border-red-500' : ''}`}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <Button
          variant="outline"
          onClick={onRegenerateScript}
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
        {showUseScriptButton && onUseScript && (
          <Button
            variant="outline"
            onClick={onUseScript}
            disabled={isLoading || useScriptDisabled}
            type="button"
            className="bg-green-50 hover:bg-green-100 border-green-200"
          >
            <Check className="mr-2 h-4 w-4" />
            Use This Script
          </Button>
        )}
        {showChangeScript && onChangeScript && (
          <Button
            variant="outline"
            onClick={onChangeScript}
            disabled={isLoading}
            type="button"
          >
            Change Script
          </Button>
        )}
      </div>

      {showUseScriptButton && (
        <p className="text-xs text-muted-foreground mt-2">
          You must click "Use This Script" to confirm this script before generating the video.
        </p>
      )}
    </div>
  );
};

export default ScriptPreviewContent;
