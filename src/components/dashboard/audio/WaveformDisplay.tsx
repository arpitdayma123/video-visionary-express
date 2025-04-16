
import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Loader } from 'lucide-react';
import { WaveformDisplayProps, Region } from './types';

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  audioUrl,
  onRegionUpdate,
  onDurationChange,
  onTimeUpdate,
  onPlayStateChange,
  onReady,
  currentTime,
  trimRange
}) => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regionRef = useRef<Region | null>(null);
  const [isWaveformReady, setIsWaveformReady] = useState(false);

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
        const duration = ws.getDuration();
        onDurationChange(duration);
        setIsWaveformReady(true);
        
        // Initialize region to full duration
        const initialRegion = regionsPlugin.addRegion({
          start: 0,
          end: duration,
          color: 'rgba(var(--primary), 0.2)',
          drag: false,
          resize: true,
        });
        
        // Store region reference
        regionRef.current = initialRegion as unknown as Region;
        
        // Set initial trim range
        onRegionUpdate(0, duration * 1000);
        onReady();
      });
      
      ws.on('timeupdate', (time) => {
        onTimeUpdate(time);
        if (regionRef.current && time >= regionRef.current.end) {
          ws.pause();
          ws.seekTo(regionRef.current.start / ws.getDuration());
        }
      });
      
      ws.on('play', () => onPlayStateChange(true));
      ws.on('pause', () => onPlayStateChange(false));
      
      // Handle region updates
      ws.on('region-update-end', (region) => {
        const regionObj = region as unknown as Region;
        const start = Math.max(0, regionObj.start * 1000);
        const end = Math.min(ws.getDuration() * 1000, regionObj.end * 1000);
        onRegionUpdate(start, end);
      });
    }
    
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [audioUrl, onDurationChange, onPlayStateChange, onRegionUpdate, onReady, onTimeUpdate]);

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

  // Methods to control playback
  const play = () => {
    if (wavesurfer.current && regionRef.current) {
      // Set the playback to start of trim region
      wavesurfer.current.seekTo(regionRef.current.start / wavesurfer.current.getDuration());
      wavesurfer.current.play();
    }
  };

  const pause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.pause();
    }
  };

  const seekTo = (time: number) => {
    if (wavesurfer.current) {
      wavesurfer.current.seekTo(time / wavesurfer.current.getDuration());
    }
  };

  // Expose methods to parent
  useEffect(() => {
    // We could expose these methods via a ref or callback if needed
    const wsInstance = wavesurfer.current;
    
    return () => {
      // Cleanup
    };
  }, [wavesurfer.current]);

  return (
    <div className="mb-4 relative overflow-hidden rounded-md">
      {!isWaveformReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary z-10">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={waveformRef} className="h-20 w-full"></div>
    </div>
  );
};

export default WaveformDisplay;
