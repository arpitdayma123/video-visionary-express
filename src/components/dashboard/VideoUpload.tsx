
import React, { useState } from 'react';
import { Upload, Trash2, Check, Video, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
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

interface VideoUploadProps {
  videos: UploadedFile[];
  setVideos: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  selectedVideo: UploadedFile | null;
  setSelectedVideo: React.Dispatch<React.SetStateAction<UploadedFile | null>>;
  userId: string;
  updateProfile: (updates: any) => Promise<void>;
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
      const invalidFiles = fileArray.filter(file => {
        const isValidType = file.type === 'video/mp4';
        const isValidSize = file.size <= 30 * 1024 * 1024;
        return !isValidType || !isValidSize;
      });
      if (invalidFiles.length > 0) {
        toast({
          title: "Invalid files detected",
          description: "Please upload MP4 videos under 30MB.",
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
          const uploadingProgress = {
            ...uploadingVideos
          };
          uploadingProgress[uploadId] = 0;
          setUploadingVideos(uploadingProgress);
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `videos/${userId}/${fileName}`;
          
          // Update progress
          const progressCallback = (progress: number) => {
            setUploadingVideos(current => ({
              ...current,
              [uploadId]: progress
            }));
          };
          
          progressCallback(1);
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
          
          // Upload to BunnyCDN
          console.log(`Uploading file to BunnyCDN path: ${filePath}`);
          const bunnyUrl = await uploadToBunny(file, filePath);
          
          clearInterval(progressInterval);
          progressCallback(100);

          // Include duration in the new video object
          const newVideo = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: bunnyUrl,
            duration: duration
          };
          
          console.log("Video uploaded successfully to BunnyCDN:", newVideo);
          
          const newVideos = [...videos, newVideo];
          setVideos(newVideos);
          setSelectedVideo(newVideo);
          
          setTimeout(() => {
            setUploadingVideos(current => {
              const updated = {
                ...current
              };
              delete updated[uploadId];
              return updated;
            });
          }, 1000);

          // Update success message to include duration
          toast({
            title: "Video uploaded",
            description: `Successfully uploaded ${file.name} (${Math.round(duration)} seconds).`
          });
          
          // Important: Only update the profile with the JSON data, not the actual File object
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
  return <section className="animate-fade-in">
      <div className="flex items-center mb-4">
        <Video className="mr-2 h-5 w-5 text-primary" />
        <h2 className="text-2xl font-medium">Video Upload</h2>
      </div>
      <p className="text-muted-foreground mb-6">You can upload up to 5 videos (max 30MB each) and select one  video to continue </p>
      
      {/* Add warning alert about face visibility */}
      <Alert variant="warning" className="mb-6 border-amber-500 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-600">
          <strong>Important:</strong> Your face should be visible in the entire video without any gaps. Videos without continuous face visibility may result in errors.
        </AlertDescription>
      </Alert>
      
      <div className={`file-drop-area p-8 ${isDraggingVideo ? 'active' : ''}`} onDragOver={e => {
      e.preventDefault();
      setIsDraggingVideo(true);
    }} onDragLeave={() => setIsDraggingVideo(false)} onDrop={handleVideoUpload}>
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

      {Object.keys(uploadingVideos).length > 0 && <div className="mt-4 space-y-3">
          <h4 className="text-sm font-medium">Uploading videos...</h4>
          {Object.keys(uploadingVideos).map(id => <div key={id} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading</span>
                <span>{uploadingVideos[id]}%</span>
              </div>
              <Progress value={uploadingVideos[id]} className="h-2" />
            </div>)}
        </div>}

      {videos.length > 0 && <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Uploaded Videos ({videos.length}/5)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {videos.map(video => <Card key={video.id} className={`p-4 animate-zoom-in ${selectedVideo?.id === video.id ? 'ring-2 ring-primary' : ''}`}>
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
                    <button type="button" onClick={() => handleSelectVideo(video)} className={`p-1.5 rounded-full mr-1 transition-colors ${selectedVideo?.id === video.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary-foreground/10'}`} title="Select as target video">
                      <Check className={`h-4 w-4 ${selectedVideo?.id === video.id ? 'text-white' : 'text-muted-foreground'}`} />
                    </button>
                    <button type="button" onClick={() => handleRemoveVideo(video.id)} className="p-1.5 rounded-full hover:bg-secondary-foreground/10 transition-colors">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </Card>)}
          </div>
        </div>}
    </section>;
};

export default VideoUpload;
