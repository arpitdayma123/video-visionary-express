
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

// Helper function to check if video needs compression
export const shouldCompress = (fileSize: number, maxSizeMB: number = 30): boolean => {
  return fileSize > maxSizeMB * 1024 * 1024;
};

// Helper function to estimate compressed size
export const estimateCompressedSize = (
  originalSize: number,
  duration: number,
  targetBitrate?: number
): number => {
  // If no target bitrate specified, estimate based on original size
  if (!targetBitrate) {
    // Aim for 70% of original size as a rough estimate
    return originalSize * 0.7;
  }
  // Calculate estimated size based on bitrate (in MB)
  return (targetBitrate * duration) / (8 * 1024);
};

// Get video dimensions
export const getVideoDimensions = (file: File): Promise<{ width: number; height: number }> => {
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
    
    video.src = URL.createObjectURL(file);
  });
};

// Create video thumbnail
export const createVideoThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    video.onloadeddata = () => {
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame at 1 second or at the start
      video.currentTime = 1;
    };
    
    video.onseeked = () => {
      if (context) {
        // Draw the video frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Convert to base64
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        window.URL.revokeObjectURL(video.src);
        resolve(thumbnail);
      }
    };
    
    video.src = URL.createObjectURL(file);
  });
};

// Main compression function
export const compressVideo = async (
  videoFile: File,
  targetSizeMB: number = 25,
  onProgress: CompressionProgress = () => {}
): Promise<File> => {
  // If video is already smaller than target size, return the original
  if (!shouldCompress(videoFile.size, targetSizeMB)) {
    return videoFile;
  }

  try {
    await loadFFmpeg();
    
    const inputFileName = 'input.' + videoFile.name.split('.').pop();
    const outputFileName = 'output.mp4';
    
    ffmpeg.FS('writeFile', inputFileName, await fetchFile(videoFile));
    
    // Get original video duration and dimensions
    const duration = await getVideoDuration(videoFile);
    const { width, height } = await getVideoDimensions(videoFile);
    
    // Calculate target bitrate (in kbps) - aim for slightly lower than max to account for overhead
    const targetBitrate = Math.floor((targetSizeMB * 8192) / duration * 0.9);
    
    // Set up progress tracking
    ffmpeg.setProgress(({ ratio }) => {
      onProgress(Math.round(ratio * 100));
    });
    
    // Start compression with smart resolution handling
    const scaleFilter = width > 1920 ? '-vf "scale=1920:-2"' : ''; // Only scale down if larger than 1080p
    
    await ffmpeg.run(
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'medium',
      '-b:v', `${targetBitrate}k`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      ...(scaleFilter ? scaleFilter.split(' ') : []),
      outputFileName
    );
    
    // Read the result
    const data = ffmpeg.FS('readFile', outputFileName);
    
    // Create a new File
    const compressedFile = new File(
      [new Blob([data.buffer], { type: 'video/mp4' })],
      videoFile.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
      { type: 'video/mp4' }
    );
    
    // Clean up
    ffmpeg.FS('unlink', inputFileName);
    ffmpeg.FS('unlink', outputFileName);
    
    return compressedFile;
  } catch (error) {
    console.error('Error during video compression:', error);
    throw new Error('Video compression failed: ' + (error as Error).message);
  }
};

// Get video duration helper
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
