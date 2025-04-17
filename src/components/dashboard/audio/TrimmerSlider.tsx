
import React from 'react';
import { Slider } from '@/components/ui/slider';

interface TrimmerSliderProps {
  trimRange: [number, number];
  duration: number;
  onValueChange: (values: number[]) => void;
}

const TrimmerSlider: React.FC<TrimmerSliderProps> = ({
  trimRange,
  duration,
  onValueChange
}) => {
  return (
    <div className="mb-6">
      <Slider
        value={trimRange}
        min={0}
        max={duration * 1000}
        step={100}
        onValueChange={onValueChange}
        className="mt-6"
      />
    </div>
  );
};

export default TrimmerSlider;
