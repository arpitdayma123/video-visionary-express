import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, Trash2, Video, Mic, Briefcase, User } from 'lucide-react';
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

type CompetitorUsername = {
  id: string;
  username: string;
};

type Project = {
  id: string;
  user_id: string;
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
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorUsername[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingVoice, setIsDraggingVoice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getOrCreateProject = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data: existingProjects, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching project:', fetchError);
          toast({
            title: 'Error',
            description: 'Failed to load your project data.',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        if (existingProjects) {
          setProjectId(existingProjects.id);
          await loadUserData(existingProjects.id);
        } else {
          const { data: newProject, error: insertError } = await supabase
            .from('projects')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating project:', insertError);
            toast({
              title: 'Error',
              description: 'Failed to create new project.',
              variant: 'destructive'
            });
            setIsLoading(false);
            return;
          }

          setProjectId(newProject.id);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Unexpected error:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred.',
          variant: 'destructive'
        });
        setIsLoading(false);
      }
    };

    getOrCreateProject();
  }, [user, toast]);

  const loadUserData = async (projectId: string) => {
    try {
      const [
        { data: videoData, error: videoError },
        { data: voiceData, error: voiceError },
        { data: nicheData, error: nicheError },
        { data: competitorData, error: competitorError }
      ] = await Promise.all([
        supabase.from('videos').select('*').eq('project_id', projectId),
        supabase.from('voice_files').select('*').eq('project_id', projectId),
        supabase.from('selected_niches').select('*').eq('project_id', projectId),
        supabase.from('competitors').select('*').eq('project_id', projectId)
      ]);

      if (videoError) throw videoError;
      if (voiceError) throw voiceError;
      if (nicheError) throw nicheError;
      if (competitorError) throw competitorError;

      if (videoData) {
        const formattedVideos = videoData.map(video => ({
          id: video.id,
          name: video.name,
          size: video.size,
          type: video.type,
          url: video.url
        }));
        setVideos(formattedVideos);
      }

      if (voiceData) {
        const formattedVoiceFiles = voiceData.map(voice => ({
          id: voice.id,
          name: voice.name,
          size: voice.size,
          type: voice.type,
          url: voice.url
        }));
        setVoiceFiles(formattedVoiceFiles);
      }

      if (nicheData) {
        const nichesArray = nicheData.map(item => item.niche);
        setSelectedNiches(nichesArray);
      }

      if (competitorData) {
        const formattedCompetitors = competitorData.map(comp => ({
          id: comp.id,
          username: comp.username
        }));
        setCompetitors(formattedCompetitors);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your saved data.',
        variant: 'destructive'
      });
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    if (!projectId || !user) {
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

          const { data: videoData, error: dbError } = await supabase
            .from('videos')
            .insert({
              project_id: projectId,
              name: file.name,
              size: file.size,
              type: file.type,
              url: urlData.publicUrl
            })
            .select()
            .single();

          if (dbError) throw dbError;

          const newVideo = {
            id: videoData.id,
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl
          };

          setVideos(prev => [...prev, newVideo]);

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
    }
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    if (!projectId || !user) {
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

          const { data: voiceData, error: dbError } = await supabase
            .from('voice_files')
            .insert({
              project_id: projectId,
              name: file.name,
              size: file.size,
              type: file.type,
              url: urlData.publicUrl
            })
            .select()
            .single();

          if (dbError) throw dbError;

          const newVoiceFile = {
            id: voiceData.id,
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl
          };

          setVoiceFiles(prev => [...prev, newVoiceFile]);

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
    }
  };

  const handleNicheChange = async (niche: string) => {
    if (!projectId) return;
    
    try {
      if (selectedNiches.includes(niche)) {
        setSelectedNiches(prev => prev.filter(n => n !== niche));
        
        const { error } = await supabase
          .from('selected_niches')
          .delete()
          .eq('project_id', projectId)
          .eq('niche', niche);
          
        if (error) throw error;
      } else {
        setSelectedNiches(prev => [...prev, niche]);
        
        const { error } = await supabase
          .from('selected_niches')
          .insert({
            project_id: projectId,
            niche: niche
          });
          
        if (error) throw error;
      }
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
    if (!projectId) return;
    
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
      const { data, error } = await supabase
        .from('competitors')
        .insert({
          project_id: projectId,
          username: newCompetitor.trim()
        })
        .select()
        .single();
        
      if (error) throw error;

      const newCompetitorObj = {
        id: data.id,
        username: newCompetitor.trim()
      };

      setCompetitors(prev => [...prev, newCompetitorObj]);
      setNewCompetitor('');
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast({
        title: "Update Failed",
        description: "Failed to add competitor username.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveCompetitor = async (id: string) => {
    if (!projectId) return;
    
    try {
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', id);
        
      if (error) throw error;

      setCompetitors(prev => prev.filter(comp => comp.id !== id));
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
    if (!projectId) return;
    
    try {
      const videoToRemove = videos.find(video => video.id === id);
      if (!videoToRemove) return;

      const urlParts = videoToRemove.url.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('creator_files') + 1).join('/');

      const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);
        
      if (dbError) throw dbError;

      try {
        await supabase.storage
          .from('creator_files')
          .remove([filePath]);
      } catch (storageError) {
        console.warn('Could not remove file from storage:', storageError);
      }

      setVideos(prev => prev.filter(video => video.id !== id));
      
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
    if (!projectId) return;
    
    try {
      const fileToRemove = voiceFiles.find(file => file.id === id);
      if (!fileToRemove) return;

      const urlParts = fileToRemove.url.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('creator_files') + 1).join('/');

      const { error: dbError } = await supabase
        .from('voice_files')
        .delete()
        .eq('id', id);
        
      if (dbError) throw dbError;

      try {
        await supabase.storage
          .from('creator_files')
          .remove([filePath]);
      } catch (storageError) {
        console.warn('Could not remove file from storage:', storageError);
      }

      setVoiceFiles(prev => prev.filter(file => file.id !== id));
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (videos.length === 0 || voiceFiles.length === 0 || selectedNiches.length === 0 || competitors.length === 0) {
      toast({
        title: "Incomplete form",
        description: "Please fill in all required fields before submitting.",
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

  const isFormComplete = videos.length > 0 && voiceFiles.length > 0 && selectedNiches.length > 0 && competitors.length > 0;

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
            <p className="text-muted-foreground mb-6">Upload up to 5 MP4 videos (max 30MB each)</p>
            
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
                    <Card key={video.id} className="p-4 animate-zoom-in">
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
                        <button 
                          type="button"
                          onClick={() => handleRemoveVideo(video.id)}
                          className="p-1.5 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="animate-fade-in animation-delay-100">
            <div className="flex items-center mb-4">
              <Mic className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Voice Upload</h2>
            </div>
            <p className="text-muted-foreground mb-6">Upload up to 5 MP3 or WAV files (max 8MB each)</p>
            
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
                    <Card key={file.id} className="p-4 animate-zoom-in">
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
                        <button 
                          type="button"
                          onClick={() => handleRemoveVoiceFile(file.id)}
                          className="p-1.5 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </Card>
                  ))}
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
                  {competitors.map(competitor => (
                    <div 
                      key={competitor.id} 
                      className="inline-flex items-center bg-secondary rounded-full pl-3 pr-1 py-1 animate-zoom-in"
                    >
                      <span className="text-sm">@{competitor.username}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCompetitor(competitor.id)}
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
                Create Personalized Video
              </button>
            )}
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default Dashboard;

