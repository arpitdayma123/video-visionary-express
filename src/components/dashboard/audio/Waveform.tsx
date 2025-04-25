
import React, { useEffect, useRef } from 'react';
import { CircleDot } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface WaveformProps {
  waveformData: number[];
  trimRange: [number, number];
  currentTime: number;
  duration: number;
  isDragging: 'start' | 'end' | null;
  setIsDragging: React.Dispatch<React.SetStateAction<'start' | 'end' | null>>;
  setTrimRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

const Waveform: React.FC<WaveformProps> = ({
  waveformData,
  trimRange,
  currentTime,
  duration,
  isDragging,
  setIsDragging,
  setTrimRange,
  onMouseMove,
  onMouseUp,
  onTouchMove,
  onTouchEnd
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  // Draw waveform visualization on canvas
  useEffect(() => {
    if (canvasRef.current && waveformData.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / waveformData.length;
      const barGap = 1;
      
      // Draw the waveform
      ctx.fillStyle = 'rgba(var(--primary), 0.5)';
      
      waveformData.forEach((value, index) => {
        const barHeight = value * height * 0.8;
        const x = index * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - barGap, barHeight);
      });
      
      // Draw trim area overlay
      const startPixel = (trimRange[0] / (duration * 1000)) * width;
      const endPixel = (trimRange[1] / (duration * 1000)) * width;
      
      // Outside trim area (semi-transparent overlay)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, startPixel, height);
      ctx.fillRect(endPixel, 0, width - endPixel, height);
      
      // Playhead position
      if (currentTime > 0) {
        const playheadX = (currentTime / duration) * width;
        ctx.strokeStyle = 'rgb(var(--primary))';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
      }
    }
  }, [waveformData, trimRange, currentTime, duration]);

  // Touch event handlers
  const handleTouchStart = (position: 'start' | 'end') => (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(position);
  };

  // Mouse event handlers
  const handleMouseDown = (position: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(position);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate the trim duration
  const trimDuration = (trimRange[1] - trimRange[0]) / 1000;

  return (
    <div className="bg-secondary rounded-md p-4">
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
      
      <div 
        ref={containerRef}
        className="h-32 mb-4 relative" 
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={120} 
          className="w-full h-full bg-muted rounded-md"
        />
        
        {/* Draggable circular trim handles with touch support */}
        <div 
          className={`absolute top-0 h-full ${isMobile ? 'w-10' : 'w-6'} flex items-center justify-center cursor-ew-resize`}
          style={{ left: `calc(${(trimRange[0] / (duration * 1000)) * 100}% - ${isMobile ? '20px' : '12px'})` }}
          onMouseDown={handleMouseDown('start')}
          onTouchStart={handleTouchStart('start')}
          aria-label="Start trim handle"
        >
          <div className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} bg-primary rounded-full flex items-center justify-center shadow-md`}>
            <CircleDot className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-white`} />
          </div>
        </div>
        <div 
          className={`absolute top-0 h-full ${isMobile ? 'w-10' : 'w-6'} flex items-center justify-center cursor-ew-resize`}
          style={{ left: `calc(${(trimRange[1] / (duration * 1000)) * 100}% - ${isMobile ? '20px' : '12px'})` }}
          onMouseDown={handleMouseDown('end')}
          onTouchStart={handleTouchStart('end')}
          aria-label="End trim handle"
        >
          <div className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} bg-primary rounded-full flex items-center justify-center shadow-md`}>
            <CircleDot className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-white`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Waveform;
