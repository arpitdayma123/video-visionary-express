
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Video, Upload, Trash2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration?: number;
};

interface VideoUploadProps {
  userId: string | undefined;
  videos: UploadedFile[];
  setVideos: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  selectedVideo: UploadedFile | null;
  setSelectedVideo: React.Dispatch<React.SetStateAction<UploadedFile | null>>;
  updateProfile: (updates: any) => Promise<void>;
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  userId,
  videos,
  setVideos,
  selectedVideo,
  setSelectedVideo,
  updateProfile
}) => {
  const { toast } = useToast();
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState<{
    [key: string]: number;
  }>({});

  // Function to get media duration
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const element = file.type.startsWith('video/') 
        ? document.createElement('video') 
        : document.createElement('audio');
        
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
    } else if ('target' in e && 'files' in e.target) {
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
          const uploadingProgress = { ...uploadingVideos };
          uploadingProgress[uploadId] = 0;
          setUploadingVideos(uploadingProgress);
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}/${uuidv4()}.${fileExt}`;
          const filePath = `videos/${fileName}`;
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
          const {
            data: uploadData,
            error: uploadError
          } = await supabase.storage.from('creator_files').upload(filePath, file);
          clearInterval(progressInterval);
          if (uploadError) throw uploadError;
          progressCallback(100);
          const {
            data: urlData
          } = supabase.storage.from('creator_files').getPublicUrl(filePath);
          
          // Include duration in the new video object
          const newVideo = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl,
            duration: duration
          };
          
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
          
          await updateProfile({
            videos: newVideos,
            selected_video: newVideo
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
      if (selectedVideo && selectedVideo.id === id) {
        setSelectedVideo(null);
        await updateProfile({
          selected_video: null
        });
      }
      try {
        const urlParts = videoToRemove.url.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('creator_files') + 1).join('/');
        await supabase.storage.from('creator_files').remove([filePath]);
      } catch (storageError) {
        console.warn('Could not remove file from storage:', storageError);
      }
      const updatedVideos = videos.filter(video => video.id !== id);
      setVideos(updatedVideos);
      await updateProfile({
        videos: updatedVideos
      });
      toast({
        title: "Video removed",
        description: "Successfully removed the video."
      });
    } catch (error) {
      console.error('Error removing video:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to remove the video.",
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
    <Card className="mb-6 p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Video className="w-5 h-5" /> Target Video
      </h2>
      <p className="text-muted-foreground mb-6">
        Upload a video that you want to emulate. We'll analyze it and create similar content.
      </p>
      
      {/* Drag and drop area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center ${
          isDraggingVideo ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingVideo(true);
        }}
        onDragLeave={() => setIsDraggingVideo(false)}
        onDrop={handleVideoUpload}
      >
        <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Drag and drop your video here</h3>
        <p className="text-muted-foreground mb-4">
          MP4 format, max 30MB, duration between 50-100 seconds
        </p>
        <input
          type="file"
          id="video-upload"
          className="hidden"
          accept="video/mp4"
          multiple
          onChange={handleVideoUpload}
        />
        <Button variant="outline" onClick={() => document.getElementById('video-upload')?.click()}>
          Browse Files
        </Button>
      </div>
      
      {/* Uploaded videos section */}
      {videos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium mb-2">Your Videos</h3>
          {videos.map((video) => (
            <div
              key={video.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                selectedVideo?.id === video.id ? 'bg-primary/10 border border-primary' : 'bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Video className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{video.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(video.size / (1024 * 1024)).toFixed(2)} MB • {video.duration && Math.round(video.duration)}s
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedVideo?.id !== video.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectVideo(video)}
                  >
                    Select
                  </Button>
                )}
                {selectedVideo?.id === video.id && (
                  <div className="flex items-center gap-1 text-primary">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Selected</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveVideo(video.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Display uploading progress */}
      {Object.keys(uploadingVideos).length > 0 && (
        <div className="mt-4 space-y-4">
          {Object.entries(uploadingVideos).map(([id, progress]) => (
            <div key={id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading video...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default VideoUpload;
