
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async () => {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  await ffmpeg.load();
  return ffmpeg;
};

export const compressVideo = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  try {
    const ffmpeg = await initFFmpeg();
    
    // Set up progress handler
    ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(Math.round(progress * 100));
    });

    // Read the input file
    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';
    
    // Write the file to FFmpeg's virtual file system
    await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
    
    // Run compression command with quality settings similar to WhatsApp
    await ffmpeg.exec([
      '-i', inputFileName,
      '-c:v', 'libx264',        // Use H.264 codec
      '-crf', '28',             // Constant Rate Factor (23-28 is good quality)
      '-preset', 'medium',      // Balance between compression speed and ratio
      '-c:a', 'aac',           // Audio codec
      '-b:a', '128k',          // Audio bitrate
      '-movflags', '+faststart', // Enable fast start for web playback
      outputFileName
    ]);
    
    // Read the compressed file
    const data = await ffmpeg.readFile(outputFileName);
    
    // Clean up
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);
    
    return new Blob([data], { type: 'video/mp4' });
  } catch (error) {
    console.error('Error compressing video:', error);
    throw error;
  }
};

export const shouldCompress = (file: File) => {
  const MAX_SIZE = 30 * 1024 * 1024; // 30MB in bytes
  return file.size > MAX_SIZE;
};
