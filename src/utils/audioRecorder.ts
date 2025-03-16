
import RecordRTC, { StereoAudioRecorder } from 'recordrtc';

export interface RecordingOptions {
  onDataAvailable?: (blob: Blob) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: RecordingStatus) => void;
  onTimeUpdate?: (seconds: number) => void;
}

export type RecordingStatus = 'inactive' | 'recording' | 'paused';

class AudioRecorder {
  private recorder: RecordRTC | null = null;
  private stream: MediaStream | null = null;
  private status: RecordingStatus = 'inactive';
  private timerId: number | null = null;
  private elapsedTime: number = 0;
  private options: RecordingOptions = {};

  constructor(options: RecordingOptions = {}) {
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.status === 'recording') {
      return;
    }

    try {
      // Request high-quality audio stream with improved settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 2, // Stereo recording
          sampleRate: 48000, // High sample rate
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Initialize RecordRTC with optimal settings for voice recording
      this.recorder = new RecordRTC(this.stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: StereoAudioRecorder,
        numberOfAudioChannels: 2, // Stereo
        desiredSampRate: 48000, // 48kHz for better quality
        bufferSize: 16384, // Larger buffer for better quality
        disableLogs: true
      });

      // Start recording
      this.recorder.startRecording();
      this.status = 'recording';
      this.elapsedTime = 0;
      this.startTimer();
      this.options.onStatusChange?.(this.status);
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.options.onError?.(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }

  pause(): void {
    if (this.status !== 'recording' || !this.recorder) {
      return;
    }

    this.recorder.pauseRecording();
    this.status = 'paused';
    this.stopTimer();
    this.options.onStatusChange?.(this.status);
  }

  resume(): void {
    if (this.status !== 'paused' || !this.recorder) {
      return;
    }

    this.recorder.resumeRecording();
    this.status = 'recording';
    this.startTimer();
    this.options.onStatusChange?.(this.status);
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder || this.status === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      this.stopTimer();
      
      this.recorder.stopRecording(() => {
        try {
          const blob = this.recorder!.getBlob();
          this.options.onDataAvailable?.(blob);
          
          // Clean up
          this.releaseResources();
          
          resolve(blob);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  getStatus(): RecordingStatus {
    return this.status;
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  private startTimer(): void {
    if (this.timerId !== null) {
      return;
    }
    
    this.timerId = window.setInterval(() => {
      this.elapsedTime += 1;
      this.options.onTimeUpdate?.(this.elapsedTime);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private releaseResources(): void {
    // Stop all tracks to release microphone
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Destroy recorder instance
    if (this.recorder) {
      this.recorder.destroy();
      this.recorder = null;
    }

    this.status = 'inactive';
    this.options.onStatusChange?.(this.status);
  }
}

export default AudioRecorder;
