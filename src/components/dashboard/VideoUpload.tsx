import React, { useState, useRef } from 'react';
import { Upload, Trash2, Check, Video, AlertTriangle, ArrowDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToBunny, deleteFromBunny, getPathFromBunnyUrl } from '@/integrations/bunny/client';
import { shouldCompress, getVideoDuration, estimateCompressedSize, getVideoDimensions, createVideoThumbnail } from '@/utils/videoCompression';
import { Button } from '@/components/ui/button';

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration?: number;
  thumbnail?: string;
};

interface VideoUploadProps {
  videos: UploadedFile[];
  setVideos: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  selectedVideo: UploadedFile | null;
  setSelectedVideo: React.Dispatch<React.SetStateAction<UploadedFile | null>>;
  userId: string;
  updateProfile: (updates: any) => Promise<void>;
}

interface CompressionState {
  id: string;
  originalFile: File;
  originalSize: number;
  estimatedCompressedSize: number;
  progress: number;
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
  error?: string;
}

const VideoUpload = ({
  videos,
  setVideos,
  selectedVideo,
  setSelectedVideo,
  userId,
  updateProfile
}: VideoUploadProps) => {
  const { toast } = useToast();
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState<{
    [key: string]: number;
  }>({});
  
  // New state for handling compression
  const [compressionQueue, setCompressionQueue] = useState<CompressionState[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  
  // Worker reference
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  const initializeWorker = () => {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers are not supported in this browser. Compression will be disabled.');
      return null;
    }
    
    try {
      const worker = new Worker(
        new URL('../workers/compressionWorker.ts', import.meta.url),
        { type: 'module' }
      );
      
      worker.onmessage = (e) => {
        const { data } = e;
        
        if (data.type === 'progress') {
          updateCompressionProgress(data.progress);
        } else if (data.type === 'complete') {
          handleCompressionComplete(data.compressedFile);
        } else if (data.type === 'error') {
          handleCompressionError(data.error);
        }
      };
      
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        handleCompressionError((error as unknown as Error).message);
      };
      
      return worker;
    } catch (error) {
      console.error('Error creating worker:', error);
      toast({
        title: "Compression Error",
        description: "Could not initialize video compression. Using standard upload instead.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Update progress for current compression task
  const updateCompressionProgress = (progress: number) => {
    setCompressionQueue(queue => {
      const currentTask = queue[0];
      if (!currentTask) return queue;
      
      return [
        { ...currentTask, progress, status: 'compressing' as const },
        ...queue.slice(1)
      ];
    });
  };

  // Handle successful compression
  const handleCompressionComplete = async (compressedFile: File) => {
    setCompressionQueue(queue => {
      const currentTask = queue[0];
      if (!currentTask) return queue;
      
      // Update the current task
      const updatedQueue = [
        { 
          ...currentTask,
          status: 'uploading',
          progress: 0
        },
        ...queue.slice(1)
      ];
      
      // Start the upload process
      uploadCompressedVideo(compressedFile, currentTask.id);
      
      return updatedQueue;
    });
  };
  
  // Handle compression errors
  const handleCompressionError = (error: string) => {
    setCompressionQueue(queue => {
      const currentTask = queue[0];
      if (!currentTask) return queue;
      
      const updatedQueue = [
        { 
          ...currentTask,
          status: 'error',
          error
        },
        ...queue.slice(1)
      ];
      
      // Show error toast
      toast({
        title: "Compression Failed",
        description: `Failed to compress ${currentTask.originalFile.name}: ${error}`,
        variant: "destructive"
      });
      
      // Process next item in queue
      setTimeout(() => {
        processCompressionQueue();
      }, 1000);
      
      return updatedQueue;
    });
  };
  
  // Upload compressed video
  const uploadCompressedVideo = async (compressedFile: File, taskId: string) => {
    try {
      const uploadId = taskId;
      
      // Update progress for upload phase
      const progressCallback = (progress: number) => {
        setCompressionQueue(queue => {
          const currentTask = queue.find(task => task.id === taskId);
          if (!currentTask) return queue;
          
          return queue.map(task => 
            task.id === taskId ? { ...task, progress } : task
          );
        });
      };
      
      progressCallback(5);
      // Set up simulated progress updates
      const progressInterval = setInterval(() => {
        setCompressionQueue(queue => {
          const currentTask = queue.find(task => task.id === taskId);
          if (!currentTask || currentTask.status !== 'uploading') {
            clearInterval(progressInterval);
            return queue;
          }
          
          const newProgress = Math.min(95, currentTask.progress + 10);
          return queue.map(task => 
            task.id === taskId ? { ...task, progress: newProgress } : task
          );
        });
      }, 500);
      
      // Get video duration
      const duration = await getVideoDuration(compressedFile);
      
      // Generate thumbnail
      const thumbnail = await createVideoThumbnail(compressedFile);
      
      // Prepare upload path
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `videos/${userId}/${fileName}`;
      
      // Upload to BunnyCDN
      console.log(`Uploading compressed file to BunnyCDN path: ${filePath}`);
      const bunnyUrl = await uploadToBunny(compressedFile, filePath);
      
      clearInterval(progressInterval);
      progressCallback(100);
      
      // Create new video object
      const newVideo = {
        id: uuidv4(),
        name: compressedFile.name,
        size: compressedFile.size,
        type: compressedFile.type,
        url: bunnyUrl,
        duration,
        thumbnail
      };
      
      // Add to videos array
      const newVideos = [...videos, newVideo];
      setVideos(newVideos);
      setSelectedVideo(newVideo);
      
      // Remove from compression queue and process next
      setCompressionQueue(queue => queue.filter(task => task.id !== taskId));
      
      // Update profile
      await updateProfile({
        videos: newVideos.map(video => ({
          id: video.id,
          name: video.name,
          size: video.size,
          type: video.type,
          url: video.url,
          duration: video.duration,
          thumbnail: video.thumbnail
        })),
        selected_video: {
          id: newVideo.id,
          name: newVideo.name,
          size: newVideo.size,
          type: newVideo.type,
          url: newVideo.url,
          duration: newVideo.duration,
          thumbnail: newVideo.thumbnail
        }
      });
      
      // Show success message
      toast({
        title: "Video uploaded",
        description: `Successfully compressed and uploaded ${compressedFile.name} (${Math.round(duration)} seconds).`
      });
      
      // Process next item
      processCompressionQueue();
      
    } catch (error) {
      console.error('Error uploading compressed video:', error);
      
      setCompressionQueue(queue => {
        return queue.map(task => 
          task.id === taskId 
            ? { 
              ...task, 
              status: 'error',
              error: 'Upload failed: ' + (error as Error).message
            } 
            : task
        );
      });
      
      toast({
        title: "Upload Failed",
        description: `Failed to upload compressed video: ${(error as Error).message}`,
        variant: "destructive"
      });
      
      // Process next item
      processCompressionQueue();
    }
  };

  // Process compression queue
  const processCompressionQueue = () => {
    setCompressionQueue(queue => {
      // If queue is empty or we're already processing, do nothing
      if (queue.length === 0) {
        setIsCompressing(false);
        return queue;
      }
      
      // Get the first pending item
      const currentTask = queue[0];
      
      // Initialize worker if needed
      if (!workerRef.current) {
        const worker = initializeWorker();
        if (worker) {
          workerRef.current = worker;
        } else {
          // If worker creation failed, upload without compression
          uploadWithoutCompression(currentTask.originalFile);
          return queue.slice(1);
        }
      }
      
      // Start compression
      setIsCompressing(true);
      
      // Update status to compressing
      const updatedQueue = [
        { ...currentTask, status: 'compressing' },
        ...queue.slice(1)
      ];
      
      // Send message to worker to start compression
      workerRef.current.postMessage({
        type: 'compress',
        videoFile: currentTask.originalFile,
        targetSizeMB: 25 // Target 25MB for compressed files
      });
      
      return updatedQueue;
    });
  };
  
  // Upload without compression for fallback
  const uploadWithoutCompression = async (file: File) => {
    const uploadId = uuidv4();
    try {
      setUploadingVideos(prev => ({
        ...prev,
        [uploadId]: 0
      }));
      
      // Set up progress updates
      const progressInterval = setInterval(() => {
        setUploadingVideos(current => {
          const currentProgress = current[uploadId] || 0;
          if (currentProgress >= 90) {
            clearInterval(progressInterval);
            return current;
          }
          return {
            ...current,
            [uploadId]: Math.min(90, currentProgress + 10)
          };
        });
      }, 500);
      
      // Get video duration
      const duration = await getVideoDuration(file);
      
      // Upload to BunnyCDN
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `videos/${userId}/${fileName}`;
      
      const bunnyUrl = await uploadToBunny(file, filePath);
      
      clearInterval(progressInterval);
      setUploadingVideos(current => ({
        ...current,
        [uploadId]: 100
      }));
      
      // Create new video object
      const newVideo = {
        id: uuidv4(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: bunnyUrl,
        duration
      };
      
      // Add to videos array
      const newVideos = [...videos, newVideo];
      setVideos(newVideos);
      setSelectedVideo(newVideo);
      
      // Remove upload progress after a delay
      setTimeout(() => {
        setUploadingVideos(current => {
          const updated = { ...current };
          delete updated[uploadId];
          return updated;
        });
      }, 1000);
      
      // Update profile
      await updateProfile({
        videos: newVideos.map(video => ({
          id: video.id,
          name: video.name,
          size: video.size,
          type: video.type,
          url: video.url,
          duration: video.duration
        })),
        selected_video: {
          id: newVideo.id,
          name: newVideo.name,
          size: newVideo.size,
          type: newVideo.type,
          url: newVideo.url,
          duration: newVideo.duration
        }
      });
      
      // Show success message
      toast({
        title: "Video uploaded",
        description: `Successfully uploaded ${file.name} (${Math.round(duration)} seconds).`
      });
      
    } catch (error) {
      console.error('Error uploading video:', error);
      
      setUploadingVideos(current => {
        const updated = { ...current };
        delete updated[uploadId];
        return updated;
      });
      
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}.`,
        variant: "destructive"
      });
    }
  };

  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise(resolve => {
      const element = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('audio');
      element.preload = 'metadata';
      element.onloadedmetadata = () => {
        window.URL.revokeObjectURL(element.src);
        resolve(element.duration);
      };
      element.src = URL.createObjectURL(file);
    });
  };

  const handleRemoveVideo = async (id: string) => {
    try {
      const videoToRemove = videos.find(video => video.id === id);
      if (!videoToRemove) return;
      
      // If the deleted video is the selected one, clear the selection
      if (selectedVideo && selectedVideo.id === id) {
        setSelectedVideo(null);
        await updateProfile({
          selected_video: null
        });
      }
      
      // Delete the file from BunnyCDN storage
      try {
        const bunnyPath = getPathFromBunnyUrl(videoToRemove.url);
        
        if (bunnyPath) {
          console.log('Removing file from BunnyCDN path:', bunnyPath);
          await deleteFromBunny(bunnyPath);
          console.log('Successfully deleted file from BunnyCDN:', bunnyPath);
        } else {
          console.warn('Could not determine correct storage path from URL:', videoToRemove.url);
        }
      } catch (storageError) {
        console.warn('Error removing file from storage:', storageError);
        // Continue with UI removal even if storage removal fails
      }
      
      // Update videos state and profile
      const updatedVideos = videos.filter(video => video.id !== id);
      setVideos(updatedVideos);
      
      // Important: Only update the profile with the JSON data, not the actual File objects
      await updateProfile({
        videos: updatedVideos.map(video => ({
          id: video.id,
          name: video.name,
          size: video.size,
          type: video.type,
          url: video.url,
          duration: video.duration
        }))
      });
      
      toast({
        title: "Video removed",
        description: "Successfully removed the video from your collection and storage."
      });
    } catch (error) {
      console.error('Error removing video:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to completely remove the video. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleSelectVideo = async (video: UploadedFile) => {
    try {
      setSelectedVideo(video);
      
      // Important: Only update the profile with the JSON data, not the actual File object
      await updateProfile({
        selected_video: {
          id: video.id,
          name: video.name,
          size: video.size,
          type: video.type,
          url: video.url,
          duration: video.duration
        }
      });
      
      toast({
        title: "Target Video Selected",
        description: `"${video.name}" is now your target video.`
      });
    } catch (error) {
      console.error('Error selecting video:', error);
      toast({
        title: "Selection Failed",
        description: "Failed to select the target video.",
        variant: "destructive"
      });
    }
  };

  // Modified handleVideoUpload to include compression logic
  const handleVideoUpload = async (event: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    
    let files: FileList | null = null;
    if (event instanceof DragEvent) {
      files = event.dataTransfer?.files;
    } else {
      files = (event.target as HTMLInputElement).files;
    }
    
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('video/')) continue;
      
      if (shouldCompress(file.size)) {
        const duration = await getVideoDuration(file);
        const estimatedSize = await estimateCompressedSize(file.size, duration);
        
        setCompressionQueue(prev => [...prev, {
          id: uuidv4(),
          originalFile: file,
          originalSize: file.size / (1024 * 1024),
          estimatedCompressedSize: estimatedSize,
          progress: 0,
          status: 'pending' as const
        }]);
        
        if (!isCompressing) {
          processCompressionQueue();
        }
      } else {
        await uploadWithoutCompression(file);
      }
    }
  };

  return (
    <section className="animate-fade-in">
      <div className="flex items-center mb-4">
        <Video className="mr-2 h-5 w-5 text-primary" />
        <h2 className="text-2xl font-medium">Video Upload</h2>
      </div>
      <p className="text-muted-foreground mb-6">You can upload up to 5 videos (max 30MB each) and select one video to continue </p>
      
      {/* Video size notice */}
      <Alert variant="info" className="mb-6 border-blue-500 bg-blue-500/10">
        <AlertTriangle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-600">
          <strong>New feature:</strong> Videos larger than 30MB will be automatically compressed before upload, similar to WhatsApp and Telegram.
        </AlertDescription>
      </Alert>
      
      {/* Add warning alert about face visibility */}
      <Alert variant="warning" className="mb-6 border-amber-500 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-600">
          <strong>Important:</strong> Your face should be visible in the entire video without any gaps. Videos without continuous face visibility may result in errors.
        </AlertDescription>
      </Alert>
      
      {/* Drag/drop upload area */}
      <div 
        className={`file-drop-area p-8 ${isDraggingVideo ? 'active' : ''}`} 
        onDragOver={e => {
          e.preventDefault();
          setIsDraggingVideo(true);
        }} 
        onDragLeave={() => setIsDraggingVideo(false)} 
        onDrop={handleVideoUpload}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Drag and drop your videos here</h3>
          <p className="text-muted-foreground mb-4">Or click to browse files</p>
          <label className="button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
            <input type="file" accept="video/mp4" multiple className="hidden" onChange={handleVideoUpload} />
            Select Videos
          </label>
        </div>
      </div>

      {/* Compression Queue */}
      {compressionQueue.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Video Compression Queue</h4>
          <div className="space-y-4">
            {compressionQueue.map((task) => (
              <div key={task.id} className="p-4 border rounded-lg bg-background shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm truncate max-w-[60%]">
                    {task.originalFile.name}
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {task.status === 'pending' && 'Queued'}
                    {task.status === 'compressing' && 'Compressing'}
                    {task.status === 'uploading' && 'Uploading'}
                    {task.status === 'done' && 'Complete'}
                    {task.status === 'error' && 'Failed'}
                  </span>
                </div>
                
                <div className="flex items-center text-xs text-muted-foreground mb-2">
                  <span>{(task.originalSize).toFixed(1)} MB</span>
                  <ArrowDown className="h-3 w-3 mx-1.5" />
                  <span>{task.estimatedCompressedSize.toFixed(1)} MB (estimated)</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {task.status === 'compressing' && 'Compressing...'}
                      {task.status === 'uploading' && 'Uploading...'}
                      {task.status === 'done' && 'Complete!'}
                      {task.status === 'error' && 'Failed'}
                    </span>
                    <span>{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-2" />
                  
                  {task.error && (
                    <p className="text-xs text-destructive mt-2">{task.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Standard Upload Progress */}
      {Object.keys(uploadingVideos).length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-medium">Uploading videos...</h4>
          {Object.keys(uploadingVideos).map(id => (
            <div key={id} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading</span>
                <span>{uploadingVideos[id]}%</span>
              </div>
              <Progress value={uploadingVideos[id]} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Videos */}
      {videos.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Uploaded Videos ({videos.length}/5)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {videos.map(video => (
              <Card key={video.id} className={`p-4 animate-zoom-in ${selectedVideo?.id === video.id ? 'ring-2 ring-primary' : ''}`}>
                <div className="aspect-video mb-3 bg-secondary rounded-md overflow-hidden relative">
                  {video.thumbnail ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={video.thumbnail} 
                        alt="Video thumbnail" 
                        className="w-full h-full object-cover"
                        onClick={() => {
                          // When thumbnail is clicked, show the actual video
                          const videoElement = document.getElementById(`video-${video.id}`) as HTMLVideoElement;
                          if (videoElement) {
                            videoElement.style.display = 'block';
                            videoElement.play().catch(console.error);
                          }
                        }}
                      />
                      <video 
                        id={`video-${video.id}`}
                        src={video.url} 
                        className="w-full h-full object-contain absolute top-0 left-0"
                        style={{ display: 'none' }}
                        controls 
                        onPause={() => {
                          // When paused, show thumbnail again
                          const videoElement = document.getElementById(`video-${video.id}`) as HTMLVideoElement;
                          if (videoElement) {
                            videoElement.style.display = 'none';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <video src={video.url} className="w-full h-full object-contain" controls />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div className="truncate mr-2">
                    <p className="font-medium truncate">{video.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(video.size / (1024 * 1024)).toFixed(2)} MB
                      {video.duration && ` • ${Math.round(video.duration)}s`}
                    </p>
                  </div>
                  <div className="flex">
                    <button 
                      type="button" 
                      onClick={() => handleSelectVideo(video)} 
                      className={`p-1.5 rounded-full mr-1 transition-colors ${selectedVideo?.id === video.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary-foreground/10'}`} 
                      title="Select as target video"
                    >
                      <Check className={`h-4 w-4 ${selectedVideo?.id === video.id ? 'text-white' : 'text-muted-foreground'}`} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveVideo(video.id)} 
                      className="p-1.5 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default VideoUpload;
