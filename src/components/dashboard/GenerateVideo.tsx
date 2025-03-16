
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from 'lucide-react';

interface GenerateVideoProps {
  isFormComplete: boolean;
  userCredits: number;
  userStatus: string;
  isProcessing: boolean;
  processingProgress: number;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const GenerateVideo: React.FC<GenerateVideoProps> = ({
  isFormComplete,
  userCredits,
  userStatus,
  isProcessing,
  processingProgress,
  handleSubmit
}) => {
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Generate Custom Video</h2>
      
      {userStatus === 'Processing' && (
        <Alert className="mb-6">
          <AlertDescription>
            We are processing your old video. Once it's done, you can generate a new video.
          </AlertDescription>
        </Alert>
      )}
      
      {userCredits < 1 && (
        <Alert className="mb-6">
          <AlertDescription>
            Insufficient credits.
          </AlertDescription>
        </Alert>
      )}
      
      <p className="text-muted-foreground mb-6">
        Once you've selected a target video, voice, niches, and competitors, click the button below to generate a personalized video.
      </p>
      
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={!isFormComplete || userCredits < 1 || userStatus === 'Processing' || isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Generate Video'}
        {!isProcessing && <ExternalLink className="ml-2 h-4 w-4" />}
      </Button>
      
      {isProcessing && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing request...</span>
            <span>{processingProgress}%</span>
          </div>
          <Progress value={processingProgress} className="h-2" />
        </div>
      )}
    </Card>
  );
};

export default GenerateVideo;
