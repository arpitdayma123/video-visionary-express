
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';

interface GeneratePreviewButtonProps {
  isLoading: boolean;
  onGenerate: () => void;
  scriptOption: string;
}

const GeneratePreviewButton: React.FC<GeneratePreviewButtonProps> = ({
  isLoading,
  onGenerate,
  scriptOption
}) => {
  // Don't render the button if script option is "custom"
  if (scriptOption === 'custom') return null;

  return (
    <div className="mt-6">
      <Button
        onClick={onGenerate}
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
};

export default GeneratePreviewButton;
