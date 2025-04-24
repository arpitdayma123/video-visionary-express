
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

// Initialize FFmpeg
const ffmpeg = createFFmpeg({
  log: true,
  corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
});

// Load FFmpeg
let ffmpegLoaded = false;
const loadFFmpeg = async () => {
  if (!ffmpegLoaded) {
    await ffmpeg.load();
    ffmpegLoaded = true;
  }
};

export type CompressionProgress = (progress: number) => void;

/**
 * Compresses a video file to target a specific file size
 * @param videoFile - The video file to compress
 * @param targetSizeMB - Target size in MB (default 25MB)
 * @param onProgress - Callback for compression progress updates
 * @returns Promise with the compressed video file
 */
export const compressVideo = async (
  videoFile: File,
  targetSizeMB: number = 25,
  onProgress: CompressionProgress = () => {}
): Promise<File> => {
  // If video is already smaller than target size, return the original
  if (videoFile.size <= targetSizeMB * 1024 * 1024) {
    return videoFile;
  }

  try {
    await loadFFmpeg();
    
    const inputFileName = 'input.' + videoFile.name.split('.').pop();
    const outputFileName = 'output.mp4';
    
    // Write the file to memory
    ffmpeg.FS('writeFile', inputFileName, await fetchFile(videoFile));
    
    // Get original video duration and size to calculate bitrate
    const originalSizeInMB = videoFile.size / (1024 * 1024);
    
    // Target bitrate calculation (in kbps)
    // We use a slightly lower target than the exact calculation to account for container overhead
    const duration = await getVideoDuration(videoFile);
    const targetBitrate = Math.floor((targetSizeMB * 8192) / duration * 0.9);
    
    // Start the compression with progress tracking
    await ffmpeg.run(
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'medium',
      '-b:v', `${targetBitrate}k`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputFileName
    );
    
    // Set up progress tracking
    ffmpeg.setProgress(({ ratio }) => {
      onProgress(Math.round(ratio * 100));
    });
    
    // Read the result
    const data = ffmpeg.FS('readFile', outputFileName);
    
    // Create a new File from the compressed data
    const compressedFile = new File(
      [new Blob([data.buffer], { type: 'video/mp4' })],
      videoFile.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
      { type: 'video/mp4' }
    );
    
    // Clean up memory
    ffmpeg.FS('unlink', inputFileName);
    ffmpeg.FS('unlink', outputFileName);
    
    return compressedFile;
  } catch (error) {
    console.error('Error during video compression:', error);
    throw new Error('Video compression failed: ' + (error as Error).message);
  }
};

/**
 * Get the duration of a video file in seconds
 * @param videoFile - The video file
 * @returns Promise with the duration in seconds
 */
export const getVideoDuration = (videoFile: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
};

/**
 * Get video dimensions (width and height)
 * @param videoFile - The video file
 * @returns Promise with width and height
 */
export const getVideoDimensions = (videoFile: File): Promise<{ width: number, height: number }> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight
      });
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
};

/**
 * Estimates the compressed file size based on duration and target bitrate
 * @param durationSeconds - Video duration in seconds
 * @param targetBitrateMbps - Target bitrate in Mbps
 * @returns Estimated size in MB
 */
export const estimateCompressedSize = (durationSeconds: number, targetBitrateMbps: number = 2.5): number => {
  // Convert Mbps to Bytes per second and multiply by duration
  const estimatedBytes = (targetBitrateMbps * 1024 * 1024 / 8) * durationSeconds;
  // Convert to MB
  return estimatedBytes / (1024 * 1024);
};

/**
 * Check if a video needs compression based on file size
 * @param fileSizeMB - Current file size in MB
 * @param maxSizeMB - Maximum allowed size in MB
 * @returns boolean indicating if compression is needed
 */
export const shouldCompress = (fileSizeMB: number, maxSizeMB: number = 30): boolean => {
  return fileSizeMB > maxSizeMB;
};

/**
 * Create a video thumbnail from a video file
 * @param videoFile - The video file
 * @returns Promise with the thumbnail as a data URL
 */
export const createVideoThumbnail = async (videoFile: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to 25% of the video
      video.currentTime = video.duration * 0.25;
    };
    
    video.onseeked = () => {
      // Draw the video frame to the canvas
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      window.URL.revokeObjectURL(video.src);
      resolve(thumbnail);
    };
    
    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
};
