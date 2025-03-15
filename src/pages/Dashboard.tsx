import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, Trash2, Video, Mic, Briefcase, User, Check, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { Progress } from '@/components/ui/progress';

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

type ResultVideo = {
  url: string;
  timestamp: string;
};

const niches = ["Fashion & Style", "Beauty & Makeup", "Fitness & Health", "Food & Cooking", "Travel & Adventure", "Lifestyle", "Technology", "Business & Entrepreneurship", "Education & Learning", "Entertainment", "Gaming", "Art & Design", "Photography", "DIY & Crafts", "Parenting", "Music", "Sports", "Pets & Animals", "Motivational & Inspirational", "Comedy & Humor"];

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [videos, setVideos] = useState<UploadedFile[]>([]);
  const [voiceFiles, setVoiceFiles] = useState<UploadedFile[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<UploadedFile | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<UploadedFile | null>(null);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingVoice, setIsDraggingVoice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userCredits, setUserCredits] = useState(0);
  const [userStatus, setUserStatus] = useState<string>('Completed');
  const [uploadingVideos, setUploadingVideos] = useState<{
    [key: string]: number;
  }>({});
  const [uploadingVoices, setUploadingVoices] = useState<{
    [key: string]: number;
  }>({});

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const loadUserProfile = async () => {
      try {
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your profile data.',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }
        
        // Set user credits
        setUserCredits(profile.credit || 0);
        
        // Set user status
        setUserStatus(profile.status || 'Completed');
        
        if (profile.videos && profile.videos.length > 0) {
          setVideos(profile.videos.map((video: any) => ({
            id: video.id || uuidv4(),
            name: video.name,
            size: video.size,
            type: video.type,
            url: video.url
          })));
        }
        
        if (profile.voice_files && profile.voice_files.length > 0) {
          setVoiceFiles(profile.voice_files.map((file: any) => ({
            id: file.id || uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: file.url
          })));
        }
        
        if (profile.selected_niches && profile.selected_niches.length > 0) {
          setSelectedNiches(profile.selected_niches);
        }
        
        if (profile.competitors && profile.competitors.length > 0) {
          setCompetitors(profile.competitors);
        }
        
        if (profile.selected_video && typeof profile.selected_video === 'object') {
          const videoData = profile.selected_video as any;
          if (videoData.id && videoData.name && videoData.url) {
            setSelectedVideo({
              id: videoData.id,
              name: videoData.name,
              size: videoData.size || 0,
              type: videoData.type || 'video/mp4',
              url: videoData.url
            });
          }
        }
        
        if (profile.selected_voice && typeof profile.selected_voice === 'object') {
          const voiceData = profile.selected_voice as any;
          if (voiceData.id && voiceData.name && voiceData.url) {
            setSelectedVoice({
              id: voiceData.id,
              name: voiceData.name,
              size: voiceData.size || 0,
              type: voiceData.type || 'audio/mpeg',
              url: voiceData.url
            });
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Unexpected error loading profile:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred.',
          variant: 'destructive'
        });
        setIsLoading(false);
      }
    };
    
    loadUserProfile();
  }, [user, toast]);

  const updateProfile = async (updates: any) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update your profile.',
        variant: 'destructive'
      });
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    if (!user) {
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
      const newVideos = [...videos];
      const uploadingProgress = {
        ...uploadingVideos
      };
      for (const file of fileArray) {
        try {
          const uploadId = uuidv4();
          uploadingProgress[uploadId] = 0;
          setUploadingVideos(uploadingProgress);
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
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
          const newVideo = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl
          };
          newVideos.push(newVideo);
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
            toast({
              title: "Video uploaded",
              description: `Successfully uploaded ${file.name}.`
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

    const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
      if (!user) {
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
        setIsDraggingVoice(false);
      } else if (e.target.files) {
        files = e.target.files;
      }
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        const invalidFiles = fileArray.filter(file => {
          const isValidType = file.type === 'audio/mpeg' || file.type === 'audio/wav';
          const isValidSize = file.size <= 8 * 1024 * 1024;
          return !isValidType || !isValidSize;
        });
        if (invalidFiles.length > 0) {
          toast({
            title: "Invalid files detected",
            description: "Please upload MP3 or WAV files under 8MB.",
            variant: "destructive"
          });
          return;
        }
        if (voiceFiles.length + fileArray.length > 5) {
          toast({
            title: "Too many voice files",
            description: "You can upload a maximum of 5 voice files.",
            variant: "destructive"
          });
          return;
        }
        const newVoiceFiles = [...voiceFiles];
        const uploadingProgress = {
          ...uploadingVoices
        };
        for (const file of fileArray) {
          try {
            const uploadId = uuidv4();
            uploadingProgress[uploadId] = 0;
            setUploadingVoices(uploadingProgress);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
            const filePath = `voices/${fileName}`;
            const progressCallback = (progress: number) => {
              setUploadingVoices(current => ({
                ...current,
                [uploadId]: progress
              }));
            };
            progressCallback(1);
            const progressInterval = setInterval(() => {
              setUploadingVoices(current => {
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
            const newVoiceFile = {
              id: uuidv4(),
              name: file.name,
              size: file.size,
              type: file.type,
              url: urlData.publicUrl
            };
            newVoiceFiles.push(newVoiceFile);
            setVoiceFiles(newVoiceFiles);
            setSelectedVoice(newVoiceFile);
            setTimeout(() => {
              setUploadingVoices(current => {
                const updated = {
                  ...current
                };
                delete updated[uploadId];
                return updated;
              });
            }, 1000);
            toast({
              title: "Voice file uploaded",
              description: `Successfully uploaded ${file.name}.`
            });
            await updateProfile({
              voice_files: newVoiceFiles,
              selected_voice: newVoiceFile
            });
          } catch (error) {
            console.error('Error uploading voice file:', error);
            toast({
              title: "Upload Failed",
              description: `Failed to upload ${file.name}.`,
              variant: "destructive"
            });
          }
        }
      }
    };

    const handleNicheChange = async (niche: string) => {
      try {
        let updatedNiches;
        if (selectedNiches.includes(niche)) {
          updatedNiches = selectedNiches.filter(n => n !== niche);
        } else {
          updatedNiches = [...selectedNiches, niche];
        }
        setSelectedNiches(updatedNiches);
        await updateProfile({
          selected_niches: updatedNiches
        });
      } catch (error) {
        console.error('Error updating niches:', error);
        toast({
          title: "Update Failed",
          description: "Failed to update niche selection.",
          variant: "destructive"
        });
      }
    };

    const handleAddCompetitor = async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent form submission
      e.preventDefault();
      
      if (newCompetitor.trim() === '') return;
      if (competitors.length >= 15) {
        toast({
          title: "Maximum competitors reached",
          description: "You can add up to 15 competitor usernames.",
          variant: "destructive"
        });
        return;
      }
      try {
        const updatedCompetitors = [...competitors, newCompetitor.trim()];
        setCompetitors(updatedCompetitors);
        setNewCompetitor('');
        await updateProfile({
          competitors: updatedCompetitors
        });
      } catch (error) {
        console.error('Error adding competitor:', error);
        toast({
          title: "Update Failed",
          description: "Failed to add competitor username.",
          variant: "destructive"
        });
      }
    };

    const handleRemoveCompetitor = async (index: number) => {
      try {
        const updatedCompetitors = competitors.filter((_, i) => i !== index);
        setCompetitors(updatedCompetitors);
        await updateProfile({
          competitors: updatedCompetitors
        });
      } catch (error) {
        console.error('Error removing competitor:', error);
        toast({
          title: "Update Failed",
          description: "Failed to remove competitor username.",
          variant: "destructive"
        });
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

    const handleRemoveVoiceFile = async (id: string) => {
      try {
        const fileToRemove = voiceFiles.find(file => file.id === id);
        if (!fileToRemove) return;
        if (selectedVoice && selectedVoice.id === id) {
          setSelectedVoice(null);
          await updateProfile({
            selected_voice: null
          });
        }
        try {
          const urlParts = fileToRemove.url.split('/');
          const filePath = urlParts.slice(urlParts.indexOf('creator_files') + 1).join('/');
          await supabase.storage.from('creator_files').remove([filePath]);
        } catch (storageError) {
          console.warn('Could not remove file from storage:', storageError);
        }
        const updatedVoiceFiles = voiceFiles.filter(file => file.id !== id);
        setVoiceFiles(updatedVoiceFiles);
        await updateProfile({
          voice_files: updatedVoiceFiles
        });
        toast({
          title: "Voice file removed",
          description: "Successfully removed the voice file."
        });
      } catch (error) {
        console.error('Error removing voice file:', error);
        toast({
          title: "Removal Failed",
          description: "Failed to remove the voice file.",
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

    const handleSelectVoice = async (voice: UploadedFile) => {
      try {
        setSelectedVoice(voice);
        await updateProfile({
          selected_voice: voice
        });
        toast({
          title: "Target Voice Selected",
          description: `"${voice.name}" is now your target voice.`
        });
      } catch (error) {
        console.error('Error selecting voice:', error);
        toast({
          title: "Selection Failed",
          description: "Failed to select the target voice.",
          variant: "destructive"
        });
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (videos.length === 0 || voiceFiles.length === 0 || selectedNiches.length === 0 || competitors.length === 0 || !selectedVideo || !selectedVoice) {
      toast({
        title: "Incomplete form",
        description: "Please fill in all required fields and select a target video and voice file before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user already has a video in processing
    if (userStatus === 'Processing') {
      toast({
        title: "Processing in Progress",
        description: "We are processing your previous video request. Please wait until it's completed before generating a new one.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 800);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Update user status to Processing
      await updateProfile({
        status: 'Processing'
      });
      setUserStatus('Processing');
      
      const params = new URLSearchParams({
        userId: user.id
      });
      
      // Updated webhook URL
      const response = await fetch(`https://primary-production-ce25.up.railway.app/webhook/trendy?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to process video request');
      }
      
      toast({
        title: "Request sent successfully",
        description: "Your personalized video is being processed. Please check the Results page after 5 minutes to see your video."
      });
      
    } catch (error) {
      console.error('Error processing video:', error);
      
      // Revert status back to Completed if there was an error
      await updateProfile({
        status: 'Completed'
      });
      setUserStatus('Completed');
      
      toast({
        title: "Processing failed",
        description: "There was an error processing your request.",
        variant: "destructive"
      });
    } finally {
      clearInterval(interval);
      setProcessingProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  };

  const isFormComplete = videos.length > 0 && voiceFiles.length > 0 && selectedNiches.length > 0 && competitors.length > 0 && selectedVideo !== null && selectedVoice !== null;
  
  if (isLoading) {
    return (
      <MainLayout title="Creator Dashboard" subtitle="Loading your content...">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Creator Dashboard" subtitle="Upload your content and create personalized videos">
      <div className="section-container py-12">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-secondary/40 px-4 py-2 rounded-lg">
              <span className="text-sm mr-2">Credits:</span>
              <span className="font-medium">{userCredits}</span>
            </div>
            {userStatus === 'Processing' && (
              <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200 px-4 py-2 rounded-lg">
                <span className="text-sm">Processing video...</span>
              </div>
            )}
          </div>
          <Button onClick={() => navigate('/results')} variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View Results
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Video Upload Section */}
          <section className="animate-fade-in">
            <div className="flex items-center mb-4">
              <Video className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Video Upload</h2>
            </div>
            <p className="text-muted-foreground mb-6">Upload up to 5 MP4 videos (max 30MB each) and select one as your target video</p>
            
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

          {/* Voice Upload Section */}
          <section className="animate-fade-in">
            <div className="flex items-center mb-4">
              <Mic className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Voice Upload</h2>
            </div>
            <p className="text-muted-foreground mb-6">Upload up to 5 voice files (MP3/WAV, max 8MB each) and select one as your target voice</p>
            
            <div 
              className={`file-drop-area p-8 ${isDraggingVoice ? 'active' : ''}`} 
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingVoice(true);
              }} 
              onDragLeave={() => setIsDraggingVoice(false)} 
              onDrop={handleVoiceUpload}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Drag and drop your voice files here</h3>
                <p className="text-muted-foreground mb-4">Or click to browse files</p>
                <label className="button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                  <input type="file" accept="audio/mpeg,audio/wav" multiple className="hidden" onChange={handleVoiceUpload} />
                  Select Voice Files
                </label>
              </div>
            </div>

            {Object.keys(uploadingVoices).length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium">Uploading voice files...</h4>
                {Object.keys(uploadingVoices).map(id => (
                  <div key={id} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uploading</span>
                      <span>{uploadingVoices[id]}%</span>
                    </div>
                    <Progress value={uploadingVoices[id]} className="h-2" />
                  </div>
                ))}
              </div>
            )}

            {voiceFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Uploaded Voice Files ({voiceFiles.length}/5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {voiceFiles.map(voice => (
                    <Card key={voice.id} className={`p-4 animate-zoom-in ${selectedVoice?.id === voice.id ? 'ring-2 ring-primary' : ''}`}>
                      <div className="mb-3 bg-secondary rounded-md overflow-hidden relative p-3">
                        <audio src={voice.url} className="w-full" controls />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="truncate mr-2">
                          <p className="font-medium truncate">{voice.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(voice.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <div className="flex">
                          <button 
                            type="button" 
                            onClick={() => handleSelectVoice(voice)} 
                            className={`p-1.5 rounded-full mr-1 transition-colors ${selectedVoice?.id === voice.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary-foreground/10'}`} 
                            title="Select as target voice"
                          >
                            <Check className={`h-4 w-4 ${selectedVoice?.id === voice.id ? 'text-white' : 'text-muted-foreground'}`} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveVoiceFile(voice.id)} 
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

          {/* Niche Selection Section */}
          <section className="animate-fade-in">
            <div className="flex items-center mb-4">
              <Briefcase className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Target Niches</h2>
            </div>
            <p className="text-muted-foreground mb-6">Select up to 5 niches
