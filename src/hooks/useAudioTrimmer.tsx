import { useState, useRef, useEffect } from 'react';
import { detectSilence, needsTrimming, getAverageVolume } from '@/utils/audioProcessor';
import { bufferToWave } from '@/components/dashboard/audio/trimmerUtils';

interface UseAudioTrimmerOptions {
  audioFile: File;
  autoDetectSilence?: boolean;
}

export function useAudioTrimmer({ audioFile, autoDetectSilence = true }: UseAudioTrimmerOptions) {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 100]);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(autoDetectSilence);
  const [volumeInfo, setVolumeInfo] = useState<{
    average: number;
    isTooQuiet: boolean;
  } | null>(null);
  const [silenceDetected, setSilenceDetected] = useState(false);
  const [silenceInfo, setSilenceInfo] = useState<{
    start: number;
    end: number;
    duration: number;
  } | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);
  
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
        
        // Auto-detect silence if enabled
        if (autoDetectSilence) {
          setIsAnalyzing(true);
          
          // Check average volume
          const avgVolume = getAverageVolume(buffer);
          const isTooQuiet = avgVolume < 0.005; // Very quiet recording threshold
          
          setVolumeInfo({
            average: avgVolume,
            isTooQuiet
          });
          
          // Detect silence at beginning and end
          const { startTime, endTime } = detectSilence(buffer, 0.01);
          
          // If significant silence was detected, automatically set trim points
          if (needsTrimming(startTime, endTime, buffer.duration)) {
            setSilenceDetected(true);
            setSilenceInfo({
              start: startTime * 1000,
              end: endTime * 1000,
              duration: buffer.duration * 1000
            });
            
            // Auto-set the trim range
            setTrimRange([startTime * 1000, endTime * 1000]);
          } else {
            // Initial trim range is full audio
            setTrimRange([0, buffer.duration * 1000]);
          }
          
          setIsAnalyzing(false);
        } else {
          // Initial trim range is full audio
          setTrimRange([0, buffer.duration * 1000]);
        }
        
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
        setIsAnalyzing(false);
      }
    };
    
    generateWaveform();
    
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [audioFile, autoDetectSilence]);
  
  // Handle time update for audio playback
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  // Toggle play/pause
  const togglePlayPause = (e: React.MouseEvent<HTMLButtonElement>) => {
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
  
  // Mouse/touch move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !e.currentTarget) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
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
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !e.currentTarget) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
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
  
  // Mouse/touch release handlers
  const handleMouseUp = () => {
    setIsDragging(null);
  };
  
  const handleTouchEnd = () => {
    setIsDragging(null);
  };
  
  // Skip forward/backward 5 seconds
  const skipForward = (e: React.MouseEvent<HTMLButtonElement>) => {
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
    e.preventDefault();
    e.stopPropagation();

    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        audioRef.current.currentTime - 5
      );
    }
  };
  
  // Create the trimmed audio blob
  const saveTrimmedAudio = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!audioBuffer.current || !audioContext.current) return null;
    
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
      
      setIsSaving(false);
      return { blob: wavBlob, duration: trimmedDuration };
    } catch (error) {
      console.error('Error saving trimmed audio:', error);
      setIsSaving(false);
      return null;
    }
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
  
  // Calculate the trim duration
  const trimDuration = (trimRange[1] - trimRange[0]) / 1000;
  
  return {
    audioUrl,
    audioRef,
    isPlaying,
    duration,
    currentTime,
    trimRange,
    waveformData,
    isSaving,
    isDragging,
    isAnalyzing,
    volumeInfo,
    silenceDetected,
    silenceInfo,
    trimDuration,
    setIsDragging,
    handleTimeUpdate,
    togglePlayPause,
    handleTrimChange,
    handleMouseMove,
    handleTouchMove,
    handleMouseUp,
    handleTouchEnd,
    skipForward,
    skipBackward,
    saveTrimmedAudio,
    setTrimRange
  };
}
