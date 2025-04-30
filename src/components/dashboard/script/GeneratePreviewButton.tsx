
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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
  const [loadingMessage, setLoadingMessage] = useState('Generating Preview...');
  const [progressPercent, setProgressPercent] = useState(0);

  // Don't render the button if script option is "custom"
  if (scriptOption === 'custom') return null;
  
  // Calculate initial wait time based on script option
  useEffect(() => {
    if (isLoading && generationStartTime) {
      let initialWaitTime = 300; // Default 5 minutes (300 seconds)
      
      if (scriptOption === 'ai_remake') {
        initialWaitTime = 120; // 2 minutes for AI remake
      } else if (scriptOption === 'ig_reel') {
        initialWaitTime = 180; // 3 minutes for Instagram reel
      } else if (scriptOption === 'script_from_prompt') {
        initialWaitTime = 240; // 4 minutes for script from prompt
      }
      
      setCountdown(initialWaitTime + extendedTime);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null;
          if (prev <= 1) return 0;
          
          // Update progress percentage
          const elapsed = initialWaitTime - prev + extendedTime;
          const total = initialWaitTime + extendedTime;
          const percent = Math.min(Math.floor((elapsed / total) * 100), 95); // Cap at 95% until complete
          setProgressPercent(percent);
          
          // Update loading message based on progress
          if (elapsed < 30) {
            setLoadingMessage('Preparing script generation...');
          } else if (elapsed < 60) {
            setLoadingMessage('Analyzing content...');
          } else if (elapsed < 120) {
            setLoadingMessage('Generating script draft...');
          } else {
            setLoadingMessage('Finalizing script generation...');
          }
          
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setCountdown(null);
      setProgressPercent(0);
      setLoadingMessage('Generating Preview...');
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

  // Don't render the button if script option is "custom"
  if (scriptOption === 'custom') return null;

  return (
    <div className="mt-6 space-y-4" onClick={(e) => e.stopPropagation()}>
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
              ? `${loadingMessage} (${formatCountdown(countdown)})`
              : loadingMessage
            }
          </>
        ) : (
          'Generate Script Preview'
        )}
      </Button>
      
      {isLoading && (
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Script generation can take several minutes. Please be patient.
          </p>
        </div>
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
