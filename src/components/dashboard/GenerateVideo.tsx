
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import CreditDisplay from './CreditDisplay';
import { UploadedFile } from '@/hooks/useDashboardData';

interface GenerateVideoProps {
  isFormComplete: boolean;
  userCredits: number;
  userStatus: string;
  userId: string | undefined;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  videos: UploadedFile[];
  voiceFiles: UploadedFile[];
  selectedVideo: UploadedFile | null;
  selectedVoice: UploadedFile | null;
  selectedNiches: string[];
  competitors: string[];
  isScriptSelected?: boolean;
}

const GenerateVideo: React.FC<GenerateVideoProps> = ({
  isFormComplete,
  userCredits,
  userStatus,
  userId,
  onSubmit,
  videos,
  voiceFiles,
  selectedVideo,
  selectedVoice,
  selectedNiches,
  competitors,
  isScriptSelected = false
}) => {
  const isProcessing = userStatus === 'Processing';
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  const isGenerateEnabled = isFormComplete && userCredits >= 1 && !isProcessing && isScriptSelected;

  return (
    <section className="animate-fade-in pb-8">
      <h2 className="text-xl font-medium mb-4">Generate Video</h2>
      
      <div className="flex flex-col space-y-4">
        <div className="p-4 bg-muted rounded-md">
          <p className="font-medium text-sm mb-2">Before generating your video:</p>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>Ensure you've selected a target video and voice file</li>
            <li>Choose at least one niche for your content</li>
            <li>Add competitor accounts for inspiration</li>
            <li>Select and confirm your script</li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-muted rounded-md">
          <div>
            <CreditDisplay userCredits={userCredits} userStatus={userStatus} />
            {userCredits < 1 && (
              <p className="text-sm text-red-500 mt-1">You need at least 1 credit to generate a video.</p>
            )}
            {!isScriptSelected && isFormComplete && (
              <p className="text-sm text-amber-500 mt-1">Please confirm your script before generating.</p>
            )}
          </div>
          
          <Button 
            type="submit"
            disabled={!isGenerateEnabled}
            className="w-full sm:w-auto"
            onClick={handleSubmit}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Generate Video'
            )}
          </Button>
        </div>
        
        {isProcessing && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              Your video is currently being generated. This process may take 5-10 minutes. You'll be notified when it's ready to view in the Results section.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default GenerateVideo;
