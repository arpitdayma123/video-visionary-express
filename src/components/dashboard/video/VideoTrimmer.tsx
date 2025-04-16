
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
import LoadingOverlay from '../audio/LoadingOverlay';

interface VideoTrimmerProps {
  videoFile: File;
  onSave: (trimmedBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ videoFile, onSave, onCancel }) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 100]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Create video URL for preview
  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // Initialize video duration and trim range
  useEffect(() => {
    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        const videoDuration = videoRef.current.duration;
        setDuration(videoDuration);
        // Initial trim range from 0 to full duration (in milliseconds)
        setTrimRange([0, videoDuration * 1000]);
      }
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      if (videoElement.readyState >= 2) {
        handleLoadedMetadata();
      } else {
        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      }
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [videoRef.current]);

  // Draw video thumbnails on canvas
  useEffect(() => {
    const drawVideoThumbnails = () => {
      if (!videoRef.current || !canvasRef.current || duration <= 0) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const thumbnailCount = 10; // Number of thumbnails to draw
      const thumbnailWidth = width / thumbnailCount;
      
      // Draw thumbnails
      for (let i = 0; i < thumbnailCount; i++) {
        const timePoint = (i / thumbnailCount) * duration;
        video.currentTime = timePoint;
        
        // Use a timeout to allow the video to seek
        setTimeout(() => {
          if (ctx && video) {
            ctx.drawImage(
              video, 
              i * thumbnailWidth, 
              0, 
              thumbnailWidth, 
              height
            );
          }
        }, 100 * i); // Stagger the draws to allow seeking
      }
      
      // Draw the overlay for trim area
      setTimeout(() => {
        drawTrimOverlay();
      }, 100 * thumbnailCount + 100);
    };
    
    // When video is loaded, draw thumbnails
    const handleCanPlay = () => {
      drawVideoThumbnails();
    };
    
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('canplay', handleCanPlay);
    }
    
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('canplay', handleCanPlay);
      }
    };
  }, [duration]);

  // Draw trim overlay and playhead
  const drawTrimOverlay = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear the overlay layer
    ctx.clearRect(0, 0, width, height);
    
    // Draw semi-transparent overlay outside trim area
    const startPixel = (trimRange[0] / (duration * 1000)) * width;
    const endPixel = (trimRange[1] / (duration * 1000)) * width;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, startPixel, height);
    ctx.fillRect(endPixel, 0, width - endPixel, height);
    
    // Draw playhead position
    if (currentTime > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = 'rgb(var(--primary))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
    
    // Request the next frame
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current);
    }
    requestRef.current = requestAnimationFrame(drawTrimOverlay);
  };

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Handle time update for video playback
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Toggle play/pause
  const togglePlayPause = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        // If playing past trim end, reset to trim start
        if (currentTime * 1000 > trimRange[1]) {
          videoRef.current.currentTime = trimRange[0] / 1000;
        }
        
        // If not within trim range, set to trim start
        if (currentTime * 1000 < trimRange[0]) {
          videoRef.current.currentTime = trimRange[0] / 1000;
        }
        
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Change video position to match trim position
  useEffect(() => {
    if (videoRef.current && isPlaying) {
      // If playing past trim end, reset to trim start
      if (currentTime * 1000 > trimRange[1]) {
        videoRef.current.currentTime = trimRange[0] / 1000;
      }
    }
  }, [currentTime, trimRange, isPlaying]);

  // Handle trim range change from slider
  const handleTrimChange = (values: number[]) => {
    setTrimRange([values[0], values[1]]);
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

  // Add mouse up event listener to window to handle when mouse is released outside component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(null);
    };
    
    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Create the trimmed video blob
  const handleSaveTrim = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!videoRef.current) return;
    
    try {
      setIsSaving(true);
      
      // Calculate start and end in seconds
      const startSec = trimRange[0] / 1000;
      const endSec = trimRange[1] / 1000;
      const trimmedDuration = endSec - startSec;
      
      // Create a MediaRecorder to record the video
      const videoElement = videoRef.current;
      
      // Set video to the start point
      videoElement.currentTime = startSec;
      videoElement.muted = true;  // Mute to avoid audio feedback
      
      // Create a canvas to draw the video frames on
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Start recording from the canvas
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        onSave(blob, trimmedDuration);
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data in 100ms chunks
      
      // Play the video and capture frames
      videoElement.play();
      
      // Set up a function to draw frames to the canvas
      const drawFrame = () => {
        if (videoElement.currentTime <= endSec) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        } else {
          // Stop recording when we reach the end time
          mediaRecorder.stop();
          videoElement.pause();
          setIsSaving(false);
        }
      };
      
      // Start drawing frames
      drawFrame();
      
    } catch (error) {
      console.error('Error saving trimmed video:', error);
      setIsSaving(false);
    }
  };

  // Handle cancel button click
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    onCancel();
  };

  // Skip forward/backward 5 seconds
  const skipForward = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + 5
      );
    }
  };

  const skipBackward = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        videoRef.current.currentTime - 5
      );
    }
  };

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
      data-active-trimmer="true"
    >
      {isSaving && (
        <LoadingOverlay message="Processing video..." />
      )}
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Trim Video</h3>
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
          <video 
            ref={videoRef} 
            src={videoUrl} 
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="w-full h-auto mb-4 rounded-md object-contain max-h-64"
            controls={false}
          />
          
          <div className="flex justify-between mb-3 text-sm text-muted-foreground">
            <span>{formatTime(trimRange[0] / 1000)}</span>
            <span className="text-primary font-medium">
              Duration: {formatTime(trimDuration)}
              {trimDuration < 50 && (
                <span className="text-destructive ml-2">
                  (Min 50 seconds required)
                </span>
              )}
              {trimDuration > 100 && (
                <span className="text-destructive ml-2">
                  (Max 100 seconds allowed)
                </span>
              )}
            </span>
            <span>{formatTime(trimRange[1] / 1000)}</span>
          </div>
          
          {/* Waveform visualization */}
          <div 
            ref={containerRef}
            className="h-24 mb-4 relative" 
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={96} 
              className="w-full h-full bg-muted rounded-md"
            />
            
            {/* Draggable circular trim handles */}
            <div 
              className="absolute top-0 h-full w-6 flex items-center justify-center cursor-ew-resize"
              style={{ left: `calc(${(trimRange[0] / (duration * 1000)) * 100}% - 12px)` }}
              onMouseDown={handleMouseDown('start')}
            >
              <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                <CircleDot className="h-4 w-4 text-white" />
              </div>
            </div>
            <div 
              className="absolute top-0 h-full w-6 flex items-center justify-center cursor-ew-resize"
              style={{ left: `calc(${(trimRange[1] / (duration * 1000)) * 100}% - 12px)` }}
              onMouseDown={handleMouseDown('end')}
            >
              <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                <CircleDot className="h-4 w-4 text-white" />
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
            disabled={trimDuration < 50 || trimDuration > 100 || isSaving}
            className="gap-1"
            type="button"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Processing...' : 'Save Trimmed Video'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Trim your video to between 50 and 100 seconds by dragging the slider handles or the circular trim points.</p>
        </div>
      </div>
    </Card>
  );
};

export default VideoTrimmer;
