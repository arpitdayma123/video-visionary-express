
/**
 * Utility functions for audio processing
 */

/**
 * Analyzes audio data to detect silence at beginning and end
 * @param audioBuffer - The audio buffer to analyze
 * @param threshold - Threshold for determining silence (0-1, where 0 is complete silence)
 * @returns Object with start and end times (in seconds) after silence is removed
 */
export const detectSilence = (
  audioBuffer: AudioBuffer,
  threshold: number = 0.01
): { startTime: number; endTime: number } => {
  // Get the PCM data from the first channel
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Find the first non-silent sample from the beginning
  let startSample = 0;
  for (let i = 0; i < channelData.length; i++) {
    if (Math.abs(channelData[i]) > threshold) {
      startSample = Math.max(0, i - Math.floor(sampleRate * 0.2)); // Keep 0.2s before non-silence
      break;
    }
  }
  
  // Find the last non-silent sample from the end
  let endSample = channelData.length - 1;
  for (let i = channelData.length - 1; i >= 0; i--) {
    if (Math.abs(channelData[i]) > threshold) {
      endSample = Math.min(channelData.length - 1, i + Math.floor(sampleRate * 0.2)); // Keep 0.2s after non-silence
      break;
    }
  }
  
  // Convert samples to seconds
  const startTime = startSample / sampleRate;
  const endTime = endSample / sampleRate;
  
  // Return a valid range (even if no silence was detected)
  return {
    startTime: Math.min(startTime, audioBuffer.duration),
    endTime: Math.max(endTime, startTime + 0.1)
  };
};

/**
 * Analyzes audio data to check average volume level
 * @param audioBuffer - The audio buffer to analyze
 * @returns Average volume level (0-1)
 */
export const getAverageVolume = (audioBuffer: AudioBuffer): number => {
  const channelData = audioBuffer.getChannelData(0);
  let sum = 0;
  
  // Calculate RMS (Root Mean Square) amplitude
  for (let i = 0; i < channelData.length; i++) {
    sum += channelData[i] * channelData[i];
  }
  
  return Math.sqrt(sum / channelData.length);
};

/**
 * Check if audio needs trimming based on silence detection
 */
export const needsTrimming = (
  startTime: number,
  endTime: number,
  duration: number
): boolean => {
  // If at least 0.5 seconds total would be trimmed, it's worth trimming
  const trimAmount = (startTime) + (duration - endTime);
  return trimAmount > 0.5;
};
