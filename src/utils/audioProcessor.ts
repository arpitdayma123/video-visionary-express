
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
  
  // Use a window-based approach to better detect silence
  const windowSize = Math.floor(sampleRate * 0.03); // 30ms window
  const stepSize = Math.floor(sampleRate * 0.01); // 10ms step

  // Lower the threshold for better sensitivity to low volume
  const analysisThreshold = threshold * 0.8;
  
  // Find the first non-silent window from the beginning
  let startSample = 0;
  let foundStart = false;
  
  for (let i = 0; i < channelData.length - windowSize; i += stepSize) {
    let windowEnergy = 0;
    
    // Calculate energy for this window
    for (let j = 0; j < windowSize; j++) {
      windowEnergy += Math.abs(channelData[i + j]);
    }
    
    windowEnergy /= windowSize;
    
    if (windowEnergy > analysisThreshold) {
      // Found non-silent section - include a bit of buffer before it
      startSample = Math.max(0, i - Math.floor(sampleRate * 0.1)); // Keep 0.1s before non-silence
      foundStart = true;
      break;
    }
  }
  
  // If we didn't find a start point with the window method, use the original approach
  if (!foundStart) {
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > threshold) {
        startSample = Math.max(0, i - Math.floor(sampleRate * 0.1)); // Keep 0.1s before non-silence
        break;
      }
    }
  }
  
  // Find the last non-silent window from the end
  let endSample = channelData.length - 1;
  let foundEnd = false;
  
  for (let i = channelData.length - windowSize; i >= 0; i -= stepSize) {
    let windowEnergy = 0;
    
    // Calculate energy for this window
    for (let j = 0; j < windowSize; j++) {
      windowEnergy += Math.abs(channelData[i + j]);
    }
    
    windowEnergy /= windowSize;
    
    if (windowEnergy > analysisThreshold) {
      // Found non-silent section - include a bit of buffer after it
      endSample = Math.min(channelData.length - 1, i + windowSize + Math.floor(sampleRate * 0.1)); // Keep 0.1s after non-silence
      foundEnd = true;
      break;
    }
  }
  
  // If we didn't find an end point with the window method, use the original approach
  if (!foundEnd) {
    for (let i = channelData.length - 1; i >= 0; i--) {
      if (Math.abs(channelData[i]) > threshold) {
        endSample = Math.min(channelData.length - 1, i + Math.floor(sampleRate * 0.1)); // Keep 0.1s after non-silence
        break;
      }
    }
  }
  
  // Convert samples to seconds
  const startTime = startSample / sampleRate;
  const endTime = endSample / sampleRate;
  
  console.log(`Silence detection - Start: ${startTime.toFixed(2)}s, End: ${endTime.toFixed(2)}s, Duration: ${audioBuffer.duration.toFixed(2)}s`);
  
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
  // If at least 0.3 seconds total would be trimmed, it's worth trimming
  // Lowered from 0.5 to 0.3 to be more aggressive with silence removal
  const trimAmount = (startTime) + (duration - endTime);
  return trimAmount > 0.3;
};
