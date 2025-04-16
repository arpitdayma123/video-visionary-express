
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { formatTime } from './audioUtils';

interface TrimmerControlsProps {
  trimRange: [number, number];
  duration: number;
  onTrimChange: (values: number[]) => void;
}

const TrimmerControls: React.FC<TrimmerControlsProps> = ({
  trimRange,
  duration,
  onTrimChange
}) => {
  // Calculate the trim duration
  const trimDuration = (trimRange[1] - trimRange[0]) / 1000;
  
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-3 text-sm text-muted-foreground">
        <span>{formatTime(trimRange[0] / 1000)}</span>
        <span className="text-primary font-medium">
          Duration: {formatTime(trimDuration)}
          {trimDuration < 8 && (
            <span className="text-destructive ml-2">
              (Min 8 seconds required)
            </span>
          )}
          {trimDuration > 40 && (
            <span className="text-destructive ml-2">
              (Max 40 seconds allowed)
            </span>
          )}
        </span>
        <span>{formatTime(trimRange[1] / 1000)}</span>
      </div>
      
      <Slider
        value={trimRange}
        min={0}
        max={duration * 1000}
        step={100}
        onValueChange={onTrimChange}
        className="mt-6"
      />
    </div>
  );
};

export default TrimmerControls;
