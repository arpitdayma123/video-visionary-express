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
  AudioWaveform
} from 'lucide-react';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);

  // Create audio URL for preview
  useEffect(() => {
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  // Load audio file into AudioContext for trimming
  useEffect(() => {
    const loadAudio = async () => {
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
      } catch (error) {
        console.error('Error loading audio:', error);
      }
    };
    
    loadAudio();
    
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [audioFile]);

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

  // Handle trim range change
  const handleTrimChange = (values: number[]) => {
    setTrimRange([values[0], values[1]]);
  };

  // Create the trimmed audio blob
  const handleSaveTrim = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    if (!audioBuffer.current || !audioContext.current) return;
    
    try {
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
      className="p-6 animate-fade-in" 
      onClick={handleFormClick}
      data-active-trimmer="true" // Add this data attribute to indicate active trimming
    >
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
          
          <div className="h-20 mb-4 bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
            <AudioWaveform className="h-10 w-full absolute opacity-20" />
            <div 
              className="absolute left-0 top-0 h-full bg-primary/20" 
              style={{ 
                left: `${(trimRange[0] / (duration * 1000)) * 100}%`,
                width: `${((trimRange[1] - trimRange[0]) / (duration * 1000)) * 100}%`
              }}
            />
            <div 
              className="absolute top-0 h-full w-1 bg-primary"
              style={{ 
                left: `${(currentTime / duration) * 100}%`,
                display: currentTime > 0 ? 'block' : 'none'
              }}
            />
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
            disabled={trimDuration < 8 || trimDuration > 40}
            className="gap-1"
            type="button"
          >
            <Save className="h-4 w-4" />
            Save Trimmed Audio
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Trim your audio to between 8 and 40 seconds by dragging the slider handles.</p>
        </div>
      </div>
    </Card>
  );
};

export default AudioTrimmer;
