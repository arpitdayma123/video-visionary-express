
import React, { useState } from 'react';
import { Upload, Trash2, Check, Video, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToBunny, deleteFromBunny, getPathFromBunnyUrl } from '@/integrations/bunny/client';

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration?: number;
};

interface VideoUpload2Props {
  videos: UploadedFile[];
  setVideos: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  selectedVideo: UploadedFile | null;
  setSelectedVideo: React.Dispatch<React.SetStateAction<UploadedFile | null>>;
  userId: string;
  updateProfile: (updates: any) => Promise<void>;
}

const VideoUpload2 = ({
  videos,
  setVideos,
  selectedVideo,
  setSelectedVideo,
  userId,
  updateProfile
}: VideoUpload2Props) => {
  const { toast } = useToast();
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState<{ [key: string]: number }>({});

  // Function to get media duration
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload files.",
        variant: "destructive"
      });
      return;
    }
    
    let files: FileList | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      setIsDraggingVideo(false);
    } else if (e.target.files) {
      files = e.target.files;
    }
    
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      
      // Validate file type and size (35MB limit)
      const invalidFiles = fileArray.filter(file => {
        const isValidType = file.type === 'video/mp4';
        const isValidSize = file.size <= 35 * 1024 * 1024; // 35MB limit
        return !isValidType || !isValidSize;
      });
      
      if (invalidFiles.length > 0) {
        toast({
          title: "Invalid files detected",
          description: "Please upload MP4 videos under 35MB.",
          variant: "destructive"
        });
        return;
      }
      
      if (videos.length + fileArray.length > 5) {
        toast({
          title: "Too many videos",
          description: "You can upload a maximum of 5 videos.",
          variant: "destructive"
        });
        return;
      }

      // Process each valid file
      for (const file of fileArray) {
        try {
          // Check video duration
          const duration = await getMediaDuration(file);
          console.log(`Video duration: ${duration} seconds`);

          // Validate duration (between 50 and 100 seconds)
          if (duration < 50 || duration > 100) {
            toast({
              title: "Invalid video duration",
              description: `Video must be between 50 and 100 seconds (current: ${Math.round(duration)} seconds).`,
              variant: "destructive"
            });
            continue; // Skip this file but process others
          }
          
          const uploadId = uuidv4();
          setUploadingVideos(prev => ({
            ...prev,
            [uploadId]: 0
          }));
          
          // Generate unique filename
          const fileExt = file.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `videos/${userId}/${fileName}`;
          
          // Set up progress simulation
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
          
          console.log('Starting upload to Bunny with file:', file.name, 'to path:', filePath);
          
          // Upload to Bunny Storage
          const cdnUrl = await uploadToBunny(file, filePath);
          console.log('Upload complete, received CDN URL:', cdnUrl);
          
          clearInterval(progressInterval);
          
          setUploadingVideos(prev => ({
            ...prev,
            [uploadId]: 100
          }));

          // Create new video object
          const newVideo = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: cdnUrl,
            duration: duration
          };
          
          console.log('Created new video object:', newVideo);
          
          const newVideos = [...videos, newVideo];
          setVideos(newVideos);
          
          setTimeout(() => {
            setUploadingVideos(current => {
              const updated = { ...current };
              delete updated[uploadId];
              return updated;
            });
          }, 1000);

          // Update profile with new video information
          console.log('Updating profile with new videos array:', newVideos);
          await updateProfile({
            videos: newVideos
          });

          toast({
            title: "Video uploaded",
            description: `Successfully uploaded ${file.name} (${Math.round(duration)} seconds).`
          });
        } catch (error) {
          console.error('Error uploading video:', error);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}.`,
            variant: "destructive"
          });
        }
      }
    }
  };
  
  const handleRemoveVideo = async (id: string) => {
    try {
      const videoToRemove = videos.find(video => video.id === id);
      if (!videoToRemove) return;
      
      console.log('Removing video:', videoToRemove);
      
      // If the deleted video is the selected one, clear the selection
      if (selectedVideo && selectedVideo.id === id) {
        setSelectedVideo(null);
        await updateProfile({
          selected_video: null
        });
      }
      
      // Delete the file from Bunny Storage
      try {
        const filePath = getPathFromBunnyUrl(videoToRemove.url);
        console.log('Removing video from Bunny using path:', filePath);
        await deleteFromBunny(filePath);
        console.log('Successfully deleted video from Bunny Storage');
      } catch (storageError) {
        console.warn('Error removing file from Bunny Storage:', storageError);
        // Continue with UI removal even if storage removal fails
      }
      
      // Update videos state and profile
      const updatedVideos = videos.filter(video => video.id !== id);
      setVideos(updatedVideos);
      
      await updateProfile({
        videos: updatedVideos
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
      await updateProfile({
        selected_video: video
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
  
  return (
    <section className="animate-fade-in">
      <div className="flex items-center mb-4">
        <Video className="mr-2 h-5 w-5 text-primary" />
        <h2 className="text-2xl font-medium">Upload Video 2</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Upload up to 5 MP4 videos (max 35MB each) and select one as your target
      </p>
      
      {/* Warning alert about face visibility */}
      <Alert variant="warning" className="mb-6 border-amber-500 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-600">
          <strong>Important:</strong> Videos must be between 50 and 100 seconds. Your face should be visible throughout the entire video.
        </AlertDescription>
      </Alert>
      
      {/* Drop area for video upload */}
      <div 
        className={`file-drop-area border-2 border-dashed rounded-lg p-8 mb-6 transition ${isDraggingVideo ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`} 
        onDragOver={(e) => {
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

      {/* Upload progress indicators */}
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

      {/* Video gallery */}
      {videos.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Uploaded Videos ({videos.length}/5)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {videos.map(video => (
              <Card key={video.id} className={`p-4 animate-zoom-in ${selectedVideo?.id === video.id ? 'ring-2 ring-primary' : ''}`}>
                <div className="aspect-video mb-3 bg-secondary rounded-md overflow-hidden relative">
                  <video src={video.url} className="w-full h-full object-contain" controls />
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

export default VideoUpload2;
