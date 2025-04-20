
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ScriptPreviewProps {
  scriptOption: string;
  onUseScript: (script: string) => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Calculate word count whenever script changes
  const updateWordCount = (text: string) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  };

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newScript = e.target.value;
    setScript(newScript);
    updateWordCount(newScript);
  };

  const handleGeneratePreview = async () => {
    setIsLoading(true);
    // Simulate API call for now - replace with actual implementation
    setTimeout(() => {
      const demoScript = "This is a sample script generated based on your selection. You can edit this text or regenerate a new script using the buttons below.";
      setScript(demoScript);
      updateWordCount(demoScript);
      setIsLoading(false);
      setIsPreviewVisible(true);
    }, 1500);
  };

  const handleRegenerateScript = () => {
    setIsLoading(true);
    // Simulate regeneration - replace with actual implementation
    setTimeout(() => {
      const newScript = "This is a regenerated script with slight variations. You can continue editing or try generating another version.";
      setScript(newScript);
      updateWordCount(newScript);
      setIsLoading(false);
    }, 1500);
  };

  const handleNewScript = () => {
    setIsLoading(true);
    // Simulate new script generation - replace with actual implementation
    setTimeout(() => {
      const freshScript = "This is a completely new script with a different approach. Feel free to edit or generate another one.";
      setScript(freshScript);
      updateWordCount(freshScript);
      setIsLoading(false);
    }, 1500);
  };

  if (!isPreviewVisible) {
    return (
      <div className="mt-6">
        <Button
          onClick={handleGeneratePreview}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Generating Preview...
            </>
          ) : (
            'Generate Script Preview'
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="mt-6 p-6 animate-fade-in">
      <h3 className="text-lg font-medium mb-4">Script Preview</h3>
      
      <div className="space-y-4">
        <div className="relative">
          <Textarea
            value={script}
            onChange={handleScriptChange}
            placeholder="Your script will appear here..."
            className="min-h-[200px] resize-y font-mono text-sm"
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {wordCount} words
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => onUseScript(script)}
            disabled={!script.trim() || isLoading}
          >
            Use This Script
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRegenerateScript}
            disabled={isLoading}
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

          {scriptOption === 'ai_find' && (
            <Button
              variant="outline"
              onClick={handleNewScript}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Generating New...
                </>
              ) : (
                'New Script'
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ScriptPreview;
