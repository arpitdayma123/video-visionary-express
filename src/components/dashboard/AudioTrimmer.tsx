import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { AudioTrimmerProps } from './audio/types';
import WaveformDisplay from './audio/WaveformDisplay';
import PlaybackControls from './audio/PlaybackControls';
import TrimmerControls from './audio/TrimmerControls';
import ActionButtons from './audio/ActionButtons';
import { bufferToWave, formatTime } from './audio/audioUtils';

const AudioTrimmer: React.FC<AudioTrimmerProps> = ({ audioFile, onSave, onCancel }) => {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 100]);
  const [isWaveformReady, setIsWaveformReady] = useState(false);
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

  // Toggle play/pause
  const togglePlayPause = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    setIsPlaying(!isPlaying);
  };

  // Handle trim range change from slider
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

  // Skip forward/backward 5 seconds
  const skipForward = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    const newTime = Math.min(
      duration,
      currentTime + 5
    );
    setCurrentTime(newTime);
  };

  const skipBackward = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    const newTime = Math.max(
      0,
      currentTime - 5
    );
    setCurrentTime(newTime);
  };

  // Handle cancel button click
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();
    
    onCancel();
  };

  // Stop any form submission when clicking inside the trimmer
  const handleFormClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Calculate the trim duration for validation
  const trimDuration = (trimRange[1] - trimRange[0]) / 1000;
  const isValidDuration = trimDuration >= 8 && trimDuration <= 40;

  // Handle waveform events
  const handleRegionUpdate = (start: number, end: number) => {
    setTrimRange([start, end]);
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const handleWaveformReady = () => {
    setIsWaveformReady(true);
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
            className="hidden"
          />
          
          <WaveformDisplay
            audioFile={audioFile}
            audioUrl={audioUrl}
            onRegionUpdate={handleRegionUpdate}
            onDurationChange={handleDurationChange}
            onTimeUpdate={handleTimeUpdate}
            onPlayStateChange={handlePlayStateChange}
            onReady={handleWaveformReady}
            currentTime={currentTime}
            trimRange={trimRange}
          />
          
          <TrimmerControls
            trimRange={trimRange}
            duration={duration}
            onTrimChange={handleTrimChange}
          />

          <PlaybackControls
            isPlaying={isPlaying}
            onPlayPause={togglePlayPause}
            onSkipForward={skipForward}
            onSkipBackward={skipBackward}
          />
        </div>

        <ActionButtons
          onSave={handleSaveTrim}
          onCancel={handleCancel}
          isValidDuration={isValidDuration}
        />

        <div className="text-sm text-muted-foreground">
          <p>Trim your audio to between 8 and 40 seconds by dragging the edges of the highlighted region or using the slider below.</p>
        </div>
      </div>
    </Card>
  );
};

export default AudioTrimmer;
