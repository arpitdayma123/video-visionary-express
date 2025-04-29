
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
  const [showRetryMessage, setShowRetryMessage] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const loadingMessages = [
    "Generating Preview...",
    "Still working...",
    "This is taking a bit longer than usual...",
    "Almost there..."
  ];

  // Don't render the button if script option is "custom"
  if (scriptOption === 'custom') return null;
  
  // Calculate initial wait time based on script option
  useEffect(() => {
    if (isLoading && generationStartTime) {
      let initialWaitTime = 180; // Default 3 minutes (180 seconds)
      
      if (scriptOption === 'ai_remake') {
        initialWaitTime = 30; // 30 seconds for AI remake
      } else if (scriptOption === 'ig_reel') {
        initialWaitTime = 60; // 1 minute for Instagram reel
      }
      
      setCountdown(initialWaitTime + extendedTime);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null;
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
      
      // Update loading phase based on elapsed time
      const phaseTimer = setInterval(() => {
        setLoadingPhase(prev => (prev < loadingMessages.length - 1) ? prev + 1 : prev);
      }, 30000); // Change message every 30 seconds
      
      return () => {
        clearInterval(timer);
        clearInterval(phaseTimer);
      };
    } else {
      setCountdown(null);
      setLoadingPhase(0); // Reset to initial message when not loading
      setShowRetryMessage(false);
    }
  }, [isLoading, generationStartTime, scriptOption, extendedTime, loadingMessages.length]);
  
  // Extend the wait time if needed
  useEffect(() => {
    if (waitTimeExpired && isLoading) {
      setExtendedTime(prev => prev + 60); // Add 60 seconds
      setShowRetryMessage(true); // Show "taking longer than expected" message
    }
  }, [waitTimeExpired, isLoading]);
  
  // Format the countdown into minutes and seconds
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
    // Reset state when starting a new generation
    setExtendedTime(0);
    setLoadingPhase(0);
    setShowRetryMessage(false);
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
              : loadingMessages[loadingPhase]
            }
          </>
        ) : (
          'Generate Script Preview'
        )}
      </Button>
      
      {showRetryMessage && isLoading && (
        <p className="mt-2 text-xs text-muted-foreground">
          This is taking longer than expected. The service might be busy. We'll keep trying...
        </p>
      )}
      
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
    </div>
  );
};

export default GeneratePreviewButton;
