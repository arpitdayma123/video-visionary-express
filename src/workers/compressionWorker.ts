
import { compressVideo, CompressionProgress } from '../utils/videoCompression';

// Define message interfaces
interface CompressionRequest {
  type: 'compress';
  videoFile: File;
  targetSizeMB: number;
}

interface ProgressMessage {
  type: 'progress';
  progress: number;
}

interface CompletionMessage {
  type: 'complete';
  compressedFile: File;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

type WorkerMessage = CompressionRequest;
type WorkerResponse = ProgressMessage | CompletionMessage | ErrorMessage;

// Handle messages from the main thread
self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { data } = e;

  if (data.type === 'compress') {
    try {
      const { videoFile, targetSizeMB } = data;
      
      // Create progress callback
      const onProgress: CompressionProgress = (progress) => {
        self.postMessage({
          type: 'progress',
          progress
        });
      };
      
      // Compress the video
      const compressedFile = await compressVideo(videoFile, targetSizeMB, onProgress);
      
      // Send completion message
      self.postMessage({
        type: 'complete',
        compressedFile
      });
    } catch (error) {
      // Send error message
      self.postMessage({
        type: 'error',
        error: (error as Error).message
      });
    }
  }
};

// Fix for TypeScript with Web Workers
export {};
