
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSkipForward: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSkipBackward: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlayPause,
  onSkipForward,
  onSkipBackward
}) => {
  return (
    <div className="flex justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onSkipBackward}
        aria-label="Skip backward 5 seconds"
        type="button"
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      <Button 
        onClick={onPlayPause}
        variant="secondary"
        className="w-20"
        aria-label={isPlaying ? "Pause" : "Play"}
        type="button"
      >
        {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onSkipForward}
        aria-label="Skip forward 5 seconds"
        type="button"
      >
        <SkipForward className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PlaybackControls;
