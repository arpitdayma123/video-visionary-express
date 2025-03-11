import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, Trash2, Video, Mic, Briefcase, User, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

const niches = [
  "Fashion & Style",
  "Beauty & Makeup", 
  "Fitness & Health",
  "Food & Cooking",
  "Travel & Adventure",
  "Lifestyle",
  "Technology",
  "Business & Entrepreneurship",
  "Education & Learning",
  "Entertainment",
  "Gaming",
  "Art & Design",
  "Photography",
  "DIY & Crafts",
  "Parenting",
  "Music",
  "Sports",
  "Pets & Animals",
  "Motivational & Inspirational",
  "Comedy & Humor"
];

const Dashboard = () => {
  const { toast } = useToast();
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
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const loadUserProfile = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

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
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

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

      for (const file of fileArray) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
          const filePath = `videos/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('creator_files')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('creator_files')
            .getPublicUrl(filePath);

          const newVideo = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl
          };

          newVideos.push(newVideo);

          toast({
            title: "Video uploaded",
            description: `Successfully uploaded ${file.name}.`
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

      setVideos(newVideos);
      await updateProfile({ videos: newVideos });
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

      for (const file of fileArray) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
          const filePath = `voices/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('creator_files')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('creator_files')
            .getPublicUrl(filePath);

          const newVoiceFile = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl
          };

          newVoiceFiles.push(newVoiceFile);

          toast({
            title: "Voice file uploaded",
            description: `Successfully uploaded ${file.name}.`
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

      setVoiceFiles(newVoiceFiles);
      await updateProfile({ voice_files: newVoiceFiles });
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
      await updateProfile({ selected_niches: updatedNiches });
    } catch (error) {
      console.error('Error updating niches:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update niche selection.",
        variant: "destructive"
      });
    }
  };

  const handleAddCompetitor = async () => {
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
      await updateProfile({ competitors: updatedCompetitors });
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
      await updateProfile({ competitors: updatedCompetitors });
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
        await updateProfile({ selected_video: null });
      }

      try {
        const urlParts = videoToRemove.url.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('creator_files') + 1).join('/');
        await supabase.storage
          .from('creator_files')
          .remove([filePath]);
      } catch (storageError) {
        console.warn('Could not remove file from storage:', storageError);
      }

      const updatedVideos = videos.filter(video => video.id !== id);
      setVideos(updatedVideos);
      await updateProfile({ videos: updatedVideos });
      
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
        await updateProfile({ selected_voice: null });
      }

      try {
        const urlParts = fileToRemove.url.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('creator_files') + 1).join('/');
        await supabase.storage
          .from('creator_files')
          .remove([filePath]);
      } catch (storageError) {
        console.warn('Could not remove file from storage:', storageError);
      }

      const updatedVoiceFiles = voiceFiles.filter(file => file.id !== id);
      setVoiceFiles(updatedVoiceFiles);
      await updateProfile({ voice_files: updatedVoiceFiles });
      
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
      await updateProfile({ selected_video: video });
      
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
      await updateProfile({ selected_voice: voice });
      
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
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      setResultVideoUrl('https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4');
      
      toast({
        title: "Processing complete",
        description: "Your personalized video is ready to view!",
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "There was an error processing your request. Please try again.",
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

  const isFormComplete = videos.length > 0 && voiceFiles.length > 0 && selectedNiches.length > 0 && 
                         competitors.length > 0 && selectedVideo !== null && selectedVoice !== null;

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
        <form onSubmit={handleSubmit} className="space-y-12">
          <section className="animate-fade-in">
            <div className="flex items-center mb-4">
              <Video className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Video Upload</h2>
            </div>
            <p className="text-muted-foreground mb-6">Upload up to 5 MP4 videos (max 30MB each) and select one as your target video</p>
            
            <div 
              className={`file-drop-area p-8 ${isDraggingVideo ? 'active' : ''}`}
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
                  <input 
                    type="file" 
                    accept="video/mp4" 
                    multiple 
                    className="hidden" 
                    onChange={handleVideoUpload}
                  />
                  Select Videos
                </label>
              </div>
            </div>

            {videos.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Uploaded Videos ({videos.length}/5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {videos.map(video => (
                    <Card key={video.id} className={`p-4 animate-zoom-in ${selectedVideo?.id === video.id ? 'ring-2 ring-primary' : ''}`}>
                      <div className="aspect-video mb-3 bg-secondary rounded-md overflow-hidden">
                        <video src={video.url} className="w-full h-full object-cover" controls />
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
                            className={`p-1.5 rounded-full mr-1 transition-colors ${
                              selectedVideo?.id === video.id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-secondary-foreground/10'
                            }`}
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

            {selectedVideo && (
              <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Target Video Selected</h3>
                <div className="flex items-center">
                  <div className="w-20 h-20 mr-4 bg-secondary rounded-md overflow-hidden">
                    <video src={selectedVideo.url} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedVideo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <a 
                      href={selectedVideo.url} 
                      download={selectedVideo.name}
                      className="text-sm text-primary hover:underline mt-1 inline-block"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="animate-fade-in animation-delay-100">
            <div className="flex items-center mb-4">
              <Mic className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Voice Upload</h2>
            </div>
            <p className="text-muted-foreground mb-6">Upload up to 5 MP3 or WAV files (max 8MB each) and select one as your target voice</p>
            
            <div 
              className={`file-drop-area p-8 ${isDraggingVoice ? 'active' : ''}`}
              onDragOver={(e) => {
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
                  <input 
                    type="file" 
                    accept="audio/mpeg,audio/wav" 
                    multiple 
                    className="hidden" 
                    onChange={handleVoiceUpload}
                  />
                  Select Voice Files
                </label>
              </div>
            </div>

            {voiceFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Uploaded Voice Files ({voiceFiles.length}/5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {voiceFiles.map(file => (
                    <Card key={file.id} className={`p-4 animate-zoom-in ${selectedVoice?.id === file.id ? 'ring-2 ring-primary' : ''}`}>
                      <div className="bg-secondary rounded-md p-4 mb-3 flex justify-center items-center">
                        <audio src={file.url} className="w-full" controls />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="truncate mr-2">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <div className="flex">
                          <button 
                            type="button"
                            onClick={() => handleSelectVoice(file)}
                            className={`p-1.5 rounded-full mr-1 transition-colors ${
                              selectedVoice?.id === file.id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-secondary-foreground/10'
                            }`}
                            title="Select as target voice"
                          >
                            <Check className={`h-4 w-4 ${selectedVoice?.id === file.id ? 'text-white' : 'text-muted-foreground'}`} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveVoiceFile(file.id)}
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

            {selectedVoice && (
              <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Target Voice Selected</h3>
                <div className="flex items-center">
                  <div className="w-20 h-20 mr-4 bg-secondary rounded-md flex justify-center items-center">
                    <Mic className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedVoice.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedVoice.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <a 
                      href={selectedVoice.url} 
                      download={selectedVoice.name}
                      className="text-sm text-primary hover:underline mt-1 inline-block"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="animate-fade-in animation-delay-200">
            <div className="flex items-center mb-4">
              <Briefcase className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Niche Selection</h2>
            </div>
            <p className="text-muted-foreground mb-6">Select one or more niches that match your content</p>

            <div className="flex flex-wrap gap-2">
              {niches.map(niche => (
                <button
                  key={niche}
                  type="button"
                  onClick={() => handleNicheChange(niche)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedNiches.includes(niche)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>

            {selectedNiches.length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Selected: {selectedNiches.length} niche{selectedNiches.length !== 1 ? 's' : ''}
              </p>
            )}
          </section>

          <section className="animate-fade-in animation-delay-300">
            <div className="flex items-center mb-4">
              <User className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Competitor Usernames</h2>
            </div>
            <p className="text-muted-foreground mb-6">Add up to 15 Instagram competitor usernames</p>

            <div className="flex mb-4">
              <input
                type="text"
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                placeholder="Enter Instagram username"
                className="flex-1 px-3 py-2 border border-input rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCompetitor();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCompetitor}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-r-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {competitors.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-4">Added Competitors ({competitors.length}/15)</h3>
                <div className="flex flex-wrap gap-2">
                  {competitors.map((competitor, index) => (
                    <div 
                      key={index} 
                      className="inline-flex items-center bg-secondary rounded-full pl-3 pr-1 py-1 animate-zoom-in"
                    >
                      <span className="text-sm">@{competitor}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCompetitor(index)}
                        className="ml-2 p-1 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="animate-fade-in">
            <div className="flex items-center mb-4">
              <User className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Profile Summary</h2>
            </div>
            <div className="bg-secondary/20 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Target Video</h3>
                  {selectedVideo ? (
                    <div className="bg-white/10 p-4 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-16 h-16 mr-3 bg-secondary rounded-md overflow-hidden flex-shrink-0">
                          <video src={selectedVideo.url} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-medium">{selectedVideo.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          <a 
                            href={selectedVideo.url} 
                            download={selectedVideo.name}
                            className="text-sm text-primary hover:underline mt-1 inline-block"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-secondary/30 p-4 rounded-lg text-center">
                      <p className="text-muted-foreground">No target video selected</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Target Voice</h3>
                  {selectedVoice ? (
                    <div className="bg-white/10 p-4 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-16 h-16 mr-3 bg-secondary rounded-md flex-shrink-0 flex justify-center items-center">
                          <Mic className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{selectedVoice.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedVoice.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          <a 
                            href={selectedVoice.url} 
                            download={selectedVoice.name}
                            className="text-sm text-primary hover:underline mt-1 inline-block"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-secondary/30 p-4 rounded-lg text-center">
                      <p className="text-muted-foreground">No target voice selected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {resultVideoUrl && (
            <section className="animate-fade-in">
              <div className="flex items-center mb-4">
                <Video className="mr-2 h-5 w-5 text-primary" />
                <h2 className="text-2xl font-medium">Your Personalized Video</h2>
              </div>
              <p className="text-muted-foreground mb-6">Your personalized video is ready to download and share</p>
              
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-video w-full">
                  <video src={resultVideoUrl} className="w-full h-full object-cover" controls autoPlay />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2">Personalized Content</h3>
                  <p className="text-muted-foreground mb-4">
                    This video has been optimized based on your uploads and selected parameters.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href={resultVideoUrl} 
                      download="personalized-video.mp4"
                      className="button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Download Video
                    </a>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-input hover:bg-secondary transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(resultVideoUrl);
                        toast({
                          title: "Link copied",
                          description: "Video link copied to clipboard",
                        });
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="pt-6 animate-fade-in animation-delay-400">
            {isProcessing ? (
              <div className="space-y-4">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="text-center text-muted-foreground">
                  Processing your content... {processingProgress}%
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!isFormComplete}
                className={`w-full py-3 rounded-lg text-center transition-all ${
                  isFormComplete
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 button-hover-effect'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed'
                }`}
              >
                {isFormComplete ? 'Create Personalized Video' : (
                  `Please ${!selectedVideo ? 'select a target video' : !selectedVoice ? 'select a target voice' : 'complete all fields'}`
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
