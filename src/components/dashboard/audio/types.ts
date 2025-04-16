
import WaveSurfer from 'wavesurfer.js';

export interface AudioTrimmerProps {
  audioFile: File;
  onSave: (trimmedBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export interface Region {
  start: number;
  end: number;
  id: string;
  color: string;
  resize: boolean;
  drag: boolean;
  update: (params: Partial<Omit<Region, 'update'>>) => void;
}

export interface WaveformDisplayProps {
  audioFile: File;
  audioUrl: string;
  onRegionUpdate: (start: number, end: number) => void;
  onDurationChange: (duration: number) => void;
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onReady: () => void;
  currentTime: number;
  trimRange: [number, number];
}
