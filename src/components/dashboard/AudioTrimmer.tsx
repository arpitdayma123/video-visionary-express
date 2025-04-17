
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Save, 
  X, 
  SkipBack, 
  SkipForward,
  CircleDot
} from 'lucide-react';
import LoadingOverlay from './audio/LoadingOverlay';
import { useIsMobile } from '@/hooks/use-mobile';

interface AudioTrimmerProps {
  audioFile: File;
  onSave: (trimmedBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

const AudioTrimmer: React.FC<AudioTrimmerProps> = ({ audioFile, onSave, onCancel }) => {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 100]);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  // Create audio URL for preview
  useEffect(() => {
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  // Generate waveform data
  useEffect(() => {
    const generateWaveform = async () => {
      try {
        const context = new AudioContext();
        audioContext.current = context;
        
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = await context.decodeAudioData(arrayBuffer);
        audioBuffer.current = buffer;
        
        // Set the duration
        setDuration(buffer.duration);
        // Initial trim range is full audio
        setTrimRange([0, buffer.duration * 1000]);
        
        // Generate waveform data
        const channelData = buffer.getChannelData(0);
        const samples = 200; // Number of samples to take
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[blockStart + j] || 0);
          }
          waveform.push(sum / blockSize);
        }
        
        // Normalize waveform data
        const multiplier = Math.pow(Math.max(...waveform), -1);
        const normalizedWaveform = waveform.map(n => n * multiplier);
        
        setWaveformData(normalizedWaveform);
      } catch (error) {
        console.error('Error loading audio:', error);
      }
    };
    
    generateWaveform();
    
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [audioFile]);

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

  // Handle time update for audio playback
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Toggle play/pause
  const togglePlayPause = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // If playing past trim end, reset to trim start
        if (currentTime * 1000 > trimRange[1]) {
          audioRef.current.currentTime = trimRange[0] / 1000;
        }
        
        // If not within trim range, set to trim start
        if (currentTime * 1000 < trimRange[0]) {
          audioRef.current.currentTime = trimRange[0] / 1000;
        }
        
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Change audio position to match trim position
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      // If playing past trim end, reset to trim start
      if (currentTime * 1000 > trimRange[1]) {
        audioRef.current.currentTime = trimRange[0] / 1000;
      }
    }
  }, [currentTime, trimRange, isPlaying]);

  // Handle trim range change from slider
  const handleTrimChange = (values: number[]) => {
    setTrimRange([values[0], values[1]]);
  };

  // Touch event handlers for mobile devices
  const handleTouchStart = (position: 'start' | 'end') => (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(position);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.targetTouches[0];
    const offsetX = touch.clientX - rect.left;
    const percentage = offsetX / rect.width;
    const newPosition = Math.max(0, Math.min(percentage * (duration * 1000), duration * 1000));
    
    if (isDragging === 'start') {
      // Ensure start doesn't go beyond end point - 1 second minimum
      const newStart = Math.min(newPosition, trimRange[1] - 1000);
      setTrimRange([newStart, trimRange[1]]);
    } else {
      // Ensure end doesn't go below start point + 1 second minimum
      const newEnd = Math.max(newPosition, trimRange[0] + 1000);
      setTrimRange([trimRange[0], newEnd]);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(null);
  };

  // Manual drag handlers for trim points
  const handleMouseDown = (position: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(position);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = offsetX / rect.width;
    const newPosition = Math.max(0, Math.min(percentage * (duration * 1000), duration * 1000));
    
    if (isDragging === 'start') {
      // Ensure start doesn't go beyond end point - 1 second minimum
      const newStart = Math.min(newPosition, trimRange[1] - 1000);
      setTrimRange([newStart, trimRange[1]]);
    } else {
      // Ensure end doesn't go below start point + 1 second minimum
      const newEnd = Math.max(newPosition, trimRange[0] + 1000);
      setTrimRange([trimRange[0], newEnd]);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  // Add mouse up and touch end event listeners to window
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(null);
    };
    
    const handleGlobalTouchEnd = () => {
      setIsDragging(null);
    };
    
    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchend', handleGlobalTouchEnd);
    }
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging]);

  // Create the trimmed audio blob
  const handleSaveTrim = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    if (!audioBuffer.current || !audioContext.current) return;
    
    try {
      setIsSaving(true);
      
      // Calculate start and end in seconds
      const startSec = trimRange[0] / 1000;
      const endSec = trimRange[1] / 1000;
      const trimmedDuration = endSec - startSec;
      
      // Create new buffer for the trimmed audio
      const sampleRate = audioBuffer.current.sampleRate;
      const channelCount = audioBuffer.current.numberOfChannels;
      const frameCount = Math.floor(trimmedDuration * sampleRate);
      
      const trimmedBuffer = audioContext.current.createBuffer(
        channelCount,
        frameCount,
        sampleRate
      );
      
      // Copy the section of audio we want to keep
      for (let channel = 0; channel < channelCount; channel++) {
        const sourceData = audioBuffer.current.getChannelData(channel);
        const trimmedData = trimmedBuffer.getChannelData(channel);
        
        const startFrame = Math.floor(startSec * sampleRate);
        
        for (let i = 0; i < frameCount; i++) {
          trimmedData[i] = sourceData[startFrame + i];
        }
      }
      
      // Convert buffer to WAV blob
      const offlineContext = new OfflineAudioContext(
        channelCount,
        frameCount,
        sampleRate
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = trimmedBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const renderedBuffer = await offlineContext.startRendering();
      
      // Convert to WAV
      const wavBlob = bufferToWave(renderedBuffer, frameCount);
      
      // Call the save callback with the trimmed audio
      onSave(wavBlob, trimmedDuration);
    } catch (error) {
      console.error('Error saving trimmed audio:', error);
      setIsSaving(false);
    }
  };

  // Handle cancel button click
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();
    
    onCancel();
  };

  // Skip forward/backward 5 seconds
  const skipForward = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.duration,
        audioRef.current.currentTime + 5
      );
    }
  };

  const skipBackward = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        audioRef.current.currentTime - 5
      );
    }
  };

  // Helper function to convert AudioBuffer to WAV Blob
  function bufferToWave(abuffer: AudioBuffer, len: number) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    let offset = 0;
    let pos = 0;
    
    // Write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4); // chunk length
    
    // Write interleaved data
    for (let i = 0; i < abuffer.numberOfChannels; i++) {
      const channel = abuffer.getChannelData(i);
      if (i === 0) {
        // Only write audio data once (mono output regardless of input channels)
        for (let j = 0; j < len; j++) {
          const sample = Math.max(-1, Math.min(1, channel[j]));
          let value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          value = Math.floor(value);
          view.setInt16(pos, value, true);
          pos += 2;
        }
      }
    }
    
    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }
    
    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Format time as MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate the trim duration
  const trimDuration = (trimRange[1] - trimRange[0]) / 1000;

  // Stop any form submission when clicking inside the trimmer
  const handleFormClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Card 
      className="p-6 animate-fade-in relative" 
      onClick={handleFormClick}
      data-active-trimmer="true" // Add this data attribute to indicate active trimming
    >
      {isSaving && (
        <LoadingOverlay message="Processing audio..." />
      )}
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Trim Audio</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCancel} 
            aria-label="Cancel"
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-secondary rounded-md p-4">
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="hidden"
          />
          
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
          
          {/* Waveform visualization with touch support */}
          <div 
            ref={containerRef}
            className="h-32 mb-4 relative" 
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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

          <div className="mb-6">
            <Slider
              value={trimRange}
              min={0}
              max={duration * 1000}
              step={100}
              onValueChange={handleTrimChange}
              className="mt-6"
            />
          </div>

          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={skipBackward}
              aria-label="Skip backward 5 seconds"
              type="button"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button 
              onClick={togglePlayPause}
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
              onClick={skipForward}
              aria-label="Skip forward 5 seconds"
              type="button"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveTrim}
            disabled={trimDuration < 8 || trimDuration > 40 || isSaving}
            className="gap-1"
            type="button"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Processing...' : 'Save Trimmed Audio'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Trim your audio to between 8 and 40 seconds by dragging the {isMobile ? "circular trim points" : "slider handles or the circular trim points"}.</p>
          {isMobile && <p className="mt-2">Tap and drag the circular handles to adjust the trim points on your mobile device.</p>}
        </div>
      </div>
    </Card>
  );
};

export default AudioTrimmer;
