
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface GenerateVideoProps {
  isFormComplete: boolean;
  userCredits: number;
  userStatus: string;
  userId: string | undefined;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const GenerateVideo = ({ 
  isFormComplete, 
  userCredits, 
  userStatus,
  userId,
  onSubmit 
}: GenerateVideoProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-medium mb-1">Generate Custom Video</h2>
          <p className="text-sm text-muted-foreground">This will use 1 credit</p>
          
          {userStatus === 'Processing' && (
            <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              We are processing your old video. Once it's done, you can generate a new video.
            </div>
          )}
          
          {userCredits < 1 && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
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
          <Button 
            type="button" 
            disabled={!isFormComplete || userCredits < 1 || userStatus === 'Processing'} 
            className="w-full sm:w-auto"
            onClick={handleGenerateClick}
          >
            Generate Video
          </Button>
        )}
      </div>
    </section>
  );
};

export default GenerateVideo;
