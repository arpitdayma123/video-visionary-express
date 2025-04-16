
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
  Loader
} from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

interface AudioTrimmerProps {
  audioFile: File;
  onSave: (trimmedBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

interface Region {
  start: number;
  end: number;
  id: string;
  color: string;
  resize: boolean;
  drag: boolean;
}

const AudioTrimmer: React.FC<AudioTrimmerProps> = ({ audioFile, onSave, onCancel }) => {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 100]);
  const [isWaveformReady, setIsWaveformReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regionRef = useRef<Region | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);

  // Create audio URL for preview
  useEffect(() => {
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (waveformRef.current && audioUrl) {
      // Clear previous instance
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
      
      // Create regions plugin
      const regionsPlugin = RegionsPlugin.create();
      
      // Create new instance
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'rgba(var(--primary), 0.3)',
        progressColor: 'rgb(var(--primary))',
        cursorColor: 'rgb(var(--primary))',
        height: 80,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        plugins: [regionsPlugin],
      });
      
      wavesurfer.current = ws;
      
      // Load audio
      ws.load(audioUrl);
      
      // Set up events
      ws.on('ready', () => {
        setDuration(ws.getDuration());
        setIsWaveformReady(true);
        
        // Initialize region to full duration
        const initialRegion = regionsPlugin.addRegion({
          start: 0,
          end: ws.getDuration(),
          color: 'rgba(var(--primary), 0.2)',
          drag: false,
          resize: true,
        });
        
        // Store region reference
        regionRef.current = initialRegion as unknown as Region;
        
        // Set initial trim range
        setTrimRange([0, ws.getDuration() * 1000]);
      });
      
      ws.on('timeupdate', (time) => {
        setCurrentTime(time);
        if (regionRef.current && time >= regionRef.current.end) {
          ws.pause();
          ws.seekTo(regionRef.current.start / ws.getDuration());
        }
      });
      
      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      
      // Handle region updates
      regionsPlugin.on('region-updated', (region) => {
        const regionObj = region as unknown as Region;
        const start = Math.max(0, regionObj.start * 1000);
        const end = Math.min(ws.getDuration() * 1000, regionObj.end * 1000);
        setTrimRange([start, end]);
      });
    }
    
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [audioUrl]);

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

  // Update waveform position when trim range changes from slider
  useEffect(() => {
    if (wavesurfer.current && regionRef.current && isWaveformReady) {
      // Only update if change didn't come from waveform itself
      const region = regionRef.current;
      const currentStartMs = region.start * 1000;
      const currentEndMs = region.end * 1000;
      
      if (Math.abs(currentStartMs - trimRange[0]) > 10 || Math.abs(currentEndMs - trimRange[1]) > 10) {
        region.update({
          start: trimRange[0] / 1000,
          end: trimRange[1] / 1000
        });
      }
    }
  }, [trimRange, isWaveformReady]);

  // Toggle play/pause
  const togglePlayPause = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    if (wavesurfer.current) {
      if (isPlaying) {
        wavesurfer.current.pause();
      } else {
        // Set the playback to start of trim region
        if (regionRef.current) {
          wavesurfer.current.seekTo(regionRef.current.start / duration);
        }
        wavesurfer.current.play();
      }
    }
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

    if (wavesurfer.current) {
      const newTime = Math.min(
        duration,
        currentTime + 5
      );
      wavesurfer.current.seekTo(newTime / duration);
    }
  };

  const skipBackward = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up to the form
    e.preventDefault();
    e.stopPropagation();

    if (wavesurfer.current) {
      const newTime = Math.max(
        0,
        currentTime - 5
      );
      wavesurfer.current.seekTo(newTime / duration);
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
          
          <div className="mb-4 relative overflow-hidden rounded-md">
            {!isWaveformReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary z-10">
                <Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <div ref={waveformRef} className="h-20 w-full"></div>
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
          <p>Trim your audio to between 8 and 40 seconds by dragging the edges of the highlighted region or using the slider below.</p>
        </div>
      </div>
    </Card>
  );
};

export default AudioTrimmer;
