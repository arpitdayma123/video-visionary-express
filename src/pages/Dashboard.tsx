import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, Trash2, Video, Mic, Briefcase, User, Check, ExternalLink, Square, Play, Pause, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration?: number;
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

  // New state variables for voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
            url: video.url,
            duration: video.duration || 0
          })));
        }
        
        if (profile.voice_files && profile.voice_files.length > 0) {
          setVoiceFiles(profile.voice_files.map((file: any) => ({
            id: file.id || uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: file.url,
            duration: file.duration || 0
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
              url: videoData.url,
              duration: videoData.duration || 0
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
              url: voiceData.url,
              duration: voiceData.duration || 0
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
      
      // Validate each file before processing
      for (const file of fileArray) {
        try {
          // Check file type and size first
          const isValidType = file.type === 'video/mp4';
          const isValidSize = file.size <= 30 * 1024 * 1024;
          
          if (!isValidType || !isValidSize) {
            toast({
              title: "Invalid file",
              description: `${file.name}: Please upload MP4 videos under 30MB.`,
              variant: "destructive"
            });
            continue;
          }
          
          // Check video duration
          const duration = await getMediaDuration(file);
          if (duration < 50 || duration > 100) {
            toast({
              title: "Invalid video duration",
              description: `${file.name}: Video must be between 50 and 100 seconds (current: ${Math.round(duration)} seconds).`,
              variant: "destructive"
            });
            continue;
          }
          
          // If we reach here, the file is valid - continue with upload
          if (videos.length + 1 > 5) {
            toast({
              title: "Too many videos",
              description: "You can upload a maximum of 5 videos.",
              variant: "destructive"
            });
            return;
          }
          
          const uploadId = uuidv4();
          setUploadingVideos(prev => ({
            ...prev,
            [uploadId]: 0
          }));
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
          const filePath = `videos/${fileName}`;
          
          // Progress tracking
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
          
          // Upload to Supabase
          const { data: uploadData, error: uploadError } = 
            await supabase.storage.from('creator_files').upload(filePath, file);
            
          clearInterval(progressInterval);
          
          if (uploadError) throw uploadError;
          
          setUploadingVideos(current => ({
            ...current,
            [uploadId]: 100
          }));
          
          // Get public URL
          const { data: urlData } = 
            supabase.storage.from('creator_files').getPublicUrl(filePath);
            
          // Create new video object with duration
          const newVideo: UploadedFile = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl,
            duration: duration
          };
          
          // Update state
          const newVideos = [...videos, newVideo];
          setVideos(newVideos);
          setSelectedVideo(newVideo);
          
          // Cleanup upload progress
          setTimeout(() => {
            setUploadingVideos(current => {
              const updated = { ...current };
              delete updated[uploadId];
              return updated;
            });
          }, 1000);
          
          // Notify user
          toast({
            title: "Video uploaded",
            description: `Successfully uploaded ${file.name} (${Math.round(duration)} seconds).`
          });
          
          // Update profile
          await updateProfile({
            videos: newVideos,
            selected_video: newVideo
          });
          
        } catch (error) {
          console.error('Error processing video:', error);
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
      
      // Validate each file before processing
      for (const file of fileArray) {
        try {
          // Check file type and size first
          const isValidType = file.type === 'audio/mpeg' || file.type === 'audio/wav';
          const isValidSize = file.size <= 8 * 1024 * 1024;
          
          if (!isValidType || !isValidSize) {
            toast({
              title: "Invalid file",
              description: `${file.name}: Please upload MP3 or WAV files under 8MB.`,
              variant: "destructive"
            });
            continue;
          }
          
          // Check audio duration
          const duration = await getMediaDuration(file);
          if (duration < 8 || duration > 40) {
            toast({
              title: "Invalid audio duration",
              description: `${file.name}: Audio must be between 8 and 40 seconds (current: ${Math.round(duration)} seconds).`,
              variant: "destructive"
            });
            continue;
          }
          
          // If we reach here, the file is valid - continue with upload
          if (voiceFiles.length + 1 > 5) {
            toast({
              title: "Too many voice files",
              description: "You can upload a maximum of 5 voice files.",
              variant: "destructive"
            });
            return;
          }
          
          const uploadId = uuidv4();
          setUploadingVoices(prev => ({
            ...prev,
            [uploadId]: 0
          }));
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
          const filePath = `voices/${fileName}`;
          
          // Progress tracking
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
          
          // Upload to Supabase
          const { data: uploadData, error: uploadError } = 
            await supabase.storage.from('creator_files').upload(filePath, file);
            
          clearInterval(progressInterval);
          
          if (uploadError) throw uploadError;
          
          setUploadingVoices(current => ({
            ...current,
            [uploadId]: 100
          }));
          
          // Get public URL
          const { data: urlData } = 
            supabase.storage.from('creator_files').getPublicUrl(filePath);
            
          // Create new voice file object with duration
          const newVoiceFile: UploadedFile = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl,
            duration: duration
          };
          
          // Update state
          const newVoiceFiles = [...voiceFiles, newVoiceFile];
          setVoiceFiles(newVoiceFiles);
          setSelectedVoice(newVoiceFile);
          
          // Cleanup upload progress
          setTimeout(() => {
            setUploadingVoices(current => {
              const updated = { ...current };
              delete updated[uploadId];
              return updated;
            });
          }, 1000);
          
          // Notify user
          toast({
            title: "Voice file uploaded",
            description: `Successfully uploaded ${file.name} (${Math.round(duration)} seconds).`
          });
          
          // Update profile
          await updateProfile({
            voice_files: newVoiceFiles,
            selected_voice: newVoiceFile
          });
          
        } catch (error) {
          console.error('Error processing voice file:', error);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}.`,
            variant: "destructive"
          });
        }
      }
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Reset state
      audioChunksRef.current = [];
      setRecordingTime(0);
      setRecordedBlob(null);
      setAudioURL(null);
      
      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordedBlob(audioBlob);
        setAudioURL(audioUrl);
        
        // Get the duration of the recording
        const audioDuration = recordingTime;
        
        // Validate duration
        if (audioDuration < 8) {
          toast({
            title: "Recording too short",
            description: `Recording must be at least 8 seconds (current: ${Math.round(audioDuration)} seconds).`,
            variant: "destructive"
          });
        } else if (audioDuration > 40) {
          toast({
            title: "Recording too long",
            description: `Recording must be at most 40 seconds (current: ${Math.round(audioDuration)} seconds).`,
            variant: "destructive"
          });
        }
        
        // Close all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Setup timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop if recording exceeds 40 seconds
          if (newTime > 40 && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access your microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const saveRecording = async () => {
    if (!user || !recordedBlob) return;
    
    try {
      // Check file size
      if (recordedBlob.size > 8 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Recording exceeds 8MB limit.",
          variant: "destructive"
        });
        return;
      }
      
      // Check recording duration
      if (recordingTime < 8 || recordingTime > 40) {
        toast({
          title: "Invalid recording duration",
          description: `Recording must be between 8 and 40 seconds (current: ${Math.round(recordingTime)} seconds).`,
          variant: "destructive"
        });
        return;
      }
      
      if (voiceFiles.length >= 5) {
        toast({
          title: "Too many voice files",
          description: "You can have a maximum of 5 voice files.",
          variant: "destructive"
        });
        return;
      }
      
      const uploadId = uuidv4();
      setUploadingVoices(prev => ({
        ...prev,
        [uploadId]: 0
      }));
      
      const fileName = `${user.id}/${uuidv4()}.wav`;
      const filePath = `voices/${fileName}`;
      
      // Progress tracking
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
      
      // Upload to Supabase
      const { data: uploadData, error: uploadError } = 
        await supabase.storage.from('creator_files').upload(filePath, recordedBlob);
        
      clearInterval(progressInterval);
      
      if (uploadError) throw uploadError;
      
      setUploadingVoices(current => ({
        ...current,
        [uploadId]: 100
      }));
      
      // Get public URL
      const { data: urlData } = 
        supabase.storage.from('creator_files').getPublicUrl(filePath);
        
      // Create new voice file object
      const timestamp = new Date().toLocaleString().replace(/[/,:]/g, '-');
      const newVoiceFile: UploadedFile = {
        id: uuidv4(),
        name: `Recording_${timestamp}.wav`,
        size: recordedBlob.size,
        type: 'audio/wav',
        url: urlData.publicUrl,
        duration: recordingTime
      };
      
      // Update state
      const newVoiceFiles = [...voiceFiles, newVoiceFile];
      setVoiceFiles(newVoiceFiles);
      setSelectedVoice(newVoiceFile);
      
      // Cleanup upload progress
      setTimeout(() => {
        setUploadingVoices(current => {
          const updated = { ...current };
          delete updated[uploadId];
          return updated;
        });
      }, 1000);
      
      // Notify user
      toast({
        title: "Recording saved",
        description: `Successfully saved your recording (${Math.round(recordingTime)} seconds).`
      });
      
      // Update profile
      await updateProfile({
        voice_files: newVoiceFiles,
        selected_voice: newVoiceFile
      });
      
      // Reset recording state
      setRecordedBlob(null);
      setAudioURL(null);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save your recording.",
        variant: "destructive"
      });
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
    
    // Check if user has at least 1 credit
    if (userCredits < 1) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 1 credit to generate a video. Please purchase credits to continue.",
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
      
      // Update user status to Processing and decrement credits
      await updateProfile({
        status: 'Processing',
        credit: userCredits - 1
      });
      setUserStatus('Processing');
      setUserCredits(userCredits - 1);
      
      const params = new URLSearchParams({
        userId: user.id
      });
      
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
      
      // Revert status back to Completed and restore credit if there was an error
      await updateProfile({
        status: 'Completed',
        credit: userCredits
      });
      setUserStatus('Completed');
      setUserCredits(userCredits);
      
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
          <div className="flex items-center
