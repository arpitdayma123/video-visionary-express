
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
        
        // Also track total elapsed time
        if (generationStartTime) {
          const elapsed = Math.floor((Date.now() - generationStartTime) / 1000);
          setElapsedSeconds(elapsed);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setCountdown(null);
      setElapsedSeconds(0);
    }
  }, [isLoading, generationStartTime, scriptOption, extendedTime]);
  
  // Extend the wait time if needed
  useEffect(() => {
    if (waitTimeExpired && isLoading) {
      setExtendedTime(prev => prev + 60); // Add 60 seconds
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
    onGenerate(e);
  };

  // Generate appropriate loading message
  const getLoadingMessage = () => {
    if (countdown !== null) {
      if (countdown > 0) {
        return `Generating Preview... (${formatCountdown(countdown)})`;
      } else if (elapsedSeconds > 180) { // 3 minutes
        return `Still generating... (${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s)`;
      } else {
        return 'Finalizing preview...';
      }
    }
    return 'Generating Preview...';
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
            {getLoadingMessage()}
          </>
        ) : (
          'Generate Script Preview'
        )}
      </Button>
      
      {isLoading && elapsedSeconds > 180 && (
        <Alert className="mt-2 bg-yellow-50 border-yellow-200">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-700">
              Script generation is taking longer than usual. Please continue waiting.
            </p>
          </div>
        </Alert>
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
