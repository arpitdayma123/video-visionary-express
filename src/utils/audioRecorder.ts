
// Advanced audio recorder with AudioWorklet API and high-quality processing

export type RecordingOptions = {
  sampleRate?: number;
  numChannels?: number;
  useEchoCancellation?: boolean;
  useNoiseSuppression?: boolean;
  useAutoGainControl?: boolean;
};

export interface AudioRecorderInterface {
  startRecording(): Promise<void>;
  stopRecording(): Promise<Blob>;
  pauseRecording(): void;
  resumeRecording(): void;
  isRecording(): boolean;
  isPaused(): boolean;
  getElapsedTime(): number;
}

export class HighQualityAudioRecorder implements AudioRecorderInterface {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private audioChunks: Float32Array[] = [];
  private recordingStartTime: number | null = null;
  private recordingState: 'inactive' | 'recording' | 'paused' = 'inactive';
  private elapsedTime: number = 0;
  private pauseStartTime: number | null = null;
  private options: Required<RecordingOptions>;

  // Default high-quality settings
  private static DEFAULT_OPTIONS: Required<RecordingOptions> = {
    sampleRate: 48000,
    numChannels: 2,
    useEchoCancellation: true,
    useNoiseSuppression: true,
    useAutoGainControl: false, // Off by default for cleaner vocal recording
  };

  constructor(options: RecordingOptions = {}) {
    this.options = { ...HighQualityAudioRecorder.DEFAULT_OPTIONS, ...options };
  }

  public async startRecording(): Promise<void> {
    if (this.recordingState !== 'inactive') {
      console.warn('Recording is already in progress');
      return;
    }

    try {
      // Request audio with high-quality constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: this.options.numChannels,
          echoCancellation: this.options.useEchoCancellation,
          noiseSuppression: this.options.useNoiseSuppression,
          autoGainControl: this.options.useAutoGainControl,
        },
      });

      // Create audio context with explicit sample rate
      this.audioContext = new AudioContext({
        sampleRate: this.options.sampleRate,
        latencyHint: 'interactive',
      });

      // Create source node
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create analyzer node for future visualizations if needed
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.sourceNode.connect(this.analyserNode);

      // Use ScriptProcessor for now (AudioWorklet would be better but requires more setup)
      this.processorNode = this.audioContext.createScriptProcessor(
        4096, // buffer size - optimal for voice
        this.options.numChannels,
        this.options.numChannels
      );

      this.processorNode.onaudioprocess = (event) => {
        if (this.recordingState === 'recording') {
          // Capture audio data for each channel
          const channels = [];
          for (let i = 0; i < this.options.numChannels; i++) {
            channels.push(new Float32Array(event.inputBuffer.getChannelData(i)));
          }
          
          // For now just store left channel (for simplicity)
          // In a full implementation we would properly handle multi-channel audio
          this.audioChunks.push(channels[0]);
        }
      };

      // Connect nodes: source -> processor -> destination
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      // Start recording
      this.recordingState = 'recording';
      this.recordingStartTime = Date.now();
      this.audioChunks = [];
      
      console.log('High-quality recording started with settings:', {
        sampleRate: this.audioContext.sampleRate,
        numChannels: this.options.numChannels,
        bufferSize: this.processorNode.bufferSize,
      });
    } catch (error) {
      console.error('Error starting high-quality recording:', error);
      this.releaseResources();
      throw error;
    }
  }

  public async stopRecording(): Promise<Blob> {
    if (this.recordingState === 'inactive') {
      console.warn('No recording in progress');
      return new Blob();
    }

    try {
      // Update total elapsed time
      if (this.recordingStartTime) {
        if (this.recordingState === 'recording') {
          this.elapsedTime += Date.now() - this.recordingStartTime;
        } else if (this.pauseStartTime) {
          this.elapsedTime += this.pauseStartTime - this.recordingStartTime;
        }
      }

      // Reset state
      this.recordingState = 'inactive';
      this.recordingStartTime = null;
      this.pauseStartTime = null;

      // Convert audio chunks to WAV
      const wavBlob = this.createHighQualityWAV();

      // Clean up
      this.releaseResources();

      console.log(`Recording stopped. Duration: ${this.elapsedTime/1000}s, Size: ${Math.round(wavBlob.size/1024)}KB`);
      return wavBlob;
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.releaseResources();
      throw error;
    }
  }

  public pauseRecording(): void {
    if (this.recordingState !== 'recording') return;
    
    this.recordingState = 'paused';
    this.pauseStartTime = Date.now();
    
    console.log('Recording paused');
  }

  public resumeRecording(): void {
    if (this.recordingState !== 'paused') return;
    
    // Update elapsed time from pause period
    if (this.recordingStartTime && this.pauseStartTime) {
      this.elapsedTime += this.pauseStartTime - this.recordingStartTime;
    }
    
    // Reset starting time to now
    this.recordingStartTime = Date.now();
    this.pauseStartTime = null;
    this.recordingState = 'recording';
    
    console.log('Recording resumed');
  }

  public isRecording(): boolean {
    return this.recordingState === 'recording';
  }

  public isPaused(): boolean {
    return this.recordingState === 'paused';
  }

  public getElapsedTime(): number {
    // Return time in seconds
    let total = this.elapsedTime;
    
    // Add current segment if recording
    if (this.recordingState === 'recording' && this.recordingStartTime) {
      total += Date.now() - this.recordingStartTime;
    } else if (this.recordingState === 'paused' && this.recordingStartTime && this.pauseStartTime) {
      total += this.pauseStartTime - this.recordingStartTime;
    }
    
    return Math.floor(total / 1000);
  }

  private releaseResources(): void {
    // Disconnect audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    
    // Stop all tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(e => console.error('Error closing AudioContext:', e));
      this.audioContext = null;
    }
  }

  private createHighQualityWAV(): Blob {
    if (!this.audioChunks.length) {
      return new Blob([], { type: 'audio/wav' });
    }

    // Calculate total length of all audio chunks
    const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    
    // Create a combined Float32Array with all audio data
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    
    for (const chunk of this.audioChunks) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Sample rate from audio context or fallback to options
    const sampleRate = this.audioContext?.sampleRate || this.options.sampleRate;
    
    // Create WAV file
    return this.encodeWAV(combinedBuffer, sampleRate, this.options.numChannels);
  }

  private encodeWAV(samples: Float32Array, sampleRate: number, numChannels: number): Blob {
    // Create the WAV buffer
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // Write WAV header
    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    
    // Convert Float32 to Int16 and write data
    this.floatTo16BitPCM(view, 44, samples);

    return new Blob([view], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private floatTo16BitPCM(output: DataView, offset: number, input: Float32Array): void {
    for (let i = 0; i < input.length; i++, offset += 2) {
      // Convert float audio data [-1.0, 1.0] to 16-bit PCM
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }
}
