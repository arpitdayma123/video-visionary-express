
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface GeneratePreviewButtonProps {
  isLoading: boolean;
  onGenerate: (e: React.MouseEvent) => void;
  scriptOption: string;
  generationStartTime: number | null;
  waitTimeExpired: boolean;
  disabled?: boolean;
}

const GeneratePreviewButton: React.FC<GeneratePreviewButtonProps> = ({
  isLoading,
  onGenerate,
  scriptOption,
  generationStartTime,
  waitTimeExpired,
  disabled = false
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [extendedTime, setExtendedTime] = useState(0);
  const maxWaitTime = 600; // 10 minutes in seconds
  const [loadingPhase, setLoadingPhase] = useState(0);
  
  // Loading messages for different phases
  const loadingMessages = [
    "Generating Script...",
    "Still working on it...",
    "Processing content...",
    "Almost there...",
    "Taking a bit longer than usual..."
  ];

  // Don't render the button if script option is "custom"
  if (scriptOption === 'custom') return null;
  
  useEffect(() => {
    if (isLoading && generationStartTime) {
      let initialWaitTime = maxWaitTime; // Default to 10 minutes
      
      if (scriptOption === 'ai_remake') {
        initialWaitTime = 120; // 2 minutes for AI remake
      }
      
      setCountdown(initialWaitTime + extendedTime);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null;
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
      
      // Update loading message phase based on elapsed time
      const phaseTimer = setInterval(() => {
        setLoadingPhase(prev => {
          // Cycle through loading messages
          const nextPhase = (prev + 1) % loadingMessages.length;
          return nextPhase;
        });
      }, 30000); // Change message every 30 seconds
      
      return () => {
        clearInterval(timer);
        clearInterval(phaseTimer);
      };
    } else {
      setCountdown(null);
      setLoadingPhase(0);
    }
  }, [isLoading, generationStartTime, scriptOption, extendedTime, loadingMessages.length]);
  
  useEffect(() => {
    if (waitTimeExpired && isLoading) {
      setExtendedTime(prev => prev + 60); // Add 60 seconds if needed
    }
  }, [waitTimeExpired, isLoading]);
  
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) {
      return;
    }
    onGenerate(e);
  };

  // Don't render the button if script option is "custom"
  if (scriptOption === 'custom') return null;

  return (
    <div className="mt-6" onClick={(e) => e.stopPropagation()}>
      <Button
        onClick={handleClick}
        disabled={isLoading || disabled}
        className="w-full sm:w-auto"
        type="button"
      >
        {isLoading ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            {countdown !== null 
              ? `${loadingMessages[loadingPhase]} (${formatCountdown(countdown)})`
              : loadingMessages[loadingPhase]}
          </>
        ) : (
          'Generate Script Preview'
        )}
      </Button>
      
      {disabled && (scriptOption === 'script_from_prompt' || scriptOption === 'ig_reel') && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <div className="ml-2">
            {scriptOption === 'script_from_prompt' 
              ? 'Please enter a topic or keywords before generating a script.'
              : 'Please enter a valid Instagram reel URL before generating a script.'}
          </div>
        </Alert>
      )}

      {isLoading && (
        <div className="mt-2 text-sm text-muted-foreground">
          <p>Please wait while we generate your script. This process may take several minutes.</p>
          {countdown !== null && countdown < 300 && (
            <p className="mt-1">The script is being generated. If you don't see results after the countdown, please check the results page.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneratePreviewButton;
