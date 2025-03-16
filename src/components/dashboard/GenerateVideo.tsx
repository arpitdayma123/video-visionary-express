
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { InfoIcon, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface GenerateVideoProps {
  isFormComplete: boolean;
  userCredits: number;
  userStatus: string;
  userId: string | undefined;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  videos: any[];
  voiceFiles: any[];
  selectedVideo: any | null;
  selectedVoice: any | null;
  selectedNiches: string[];
  competitors: string[];
}

const GenerateVideo = ({ 
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
  competitors
}: GenerateVideoProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const getMissingSteps = () => {
    const steps = [];
    
    if (videos.length === 0) {
      steps.push("Upload at least one video");
    } else if (!selectedVideo) {
      steps.push("Select a target video");
    }
    
    if (voiceFiles.length === 0) {
      steps.push("Upload at least one voice file");
    } else if (!selectedVoice) {
      steps.push("Select a voice file");
    }
    
    if (selectedNiches.length === 0) {
      steps.push("Select at least one niche");
    }
    
    if (competitors.length === 0) {
      steps.push("Add at least one competitor");
    }
    
    return steps;
  };

  const missingSteps = getMissingSteps();
  const shouldShowProgress = !isFormComplete && missingSteps.length > 0;

  const handleGenerateClick = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormComplete) {
      toast({
        title: "Incomplete form",
        description: "Please fill in all required fields and select a target video and voice file before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user has at least 1 credit
    if (userCredits < 1) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 1 credit to generate a video. Please purchase credits to continue.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user already has a video in processing
    if (userStatus === 'Processing') {
      toast({
        title: "Processing in Progress",
        description: "We are processing your previous video request. Please wait until it's completed before generating a new one.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 800);
    
    try {
      await onSubmit(e);
    } finally {
      clearInterval(interval);
      setProcessingProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
      }, 500);
    }
  };

  return (
    <section className="animate-fade-in border-t border-border pt-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl font-medium mb-1">Generate Custom Video</h2>
          <p className="text-sm text-muted-foreground">This will use 1 credit</p>
          
          {userStatus === 'Processing' && (
            <div className="mt-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
              We are processing your old video. Once it's done, you can generate a new video.
            </div>
          )}
          
          {userCredits < 1 && (
            <div className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
              Insufficient credits.
            </div>
          )}
        </div>
        
        {isProcessing ? (
          <div className="w-full sm:w-64">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Processing request...</span>
              <span>{processingProgress}%</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
          </div>
        ) : (
          <div className="w-full sm:w-auto flex flex-col items-end gap-2">
            {shouldShowProgress && (
              <Alert variant="warning" className="max-w-sm mb-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Incomplete Progress</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-1 text-xs">
                    {missingSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <Button 
              type="button" 
              disabled={!isFormComplete || userCredits < 1 || userStatus === 'Processing'} 
              className="w-full sm:w-auto"
              onClick={handleGenerateClick}
            >
              Generate Video
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default GenerateVideo;
