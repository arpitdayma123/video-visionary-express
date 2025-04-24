
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
    
    ffmpeg.FS('writeFile', inputFileName, await fetchFile(videoFile));
    
    // Get original video duration
    const duration = await getVideoDuration(videoFile);
    
    // Target bitrate calculation (in kbps)
    const targetBitrate = Math.floor((targetSizeMB * 8192) / duration * 0.9);
    
    // Set up progress tracking
    ffmpeg.setProgress(({ ratio }) => {
      onProgress(Math.round(ratio * 100));
    });
    
    // Start compression
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

/**
 * Get the duration of a video file in seconds
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
