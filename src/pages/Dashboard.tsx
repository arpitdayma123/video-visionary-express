
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, Trash2, Video, Mic, Briefcase, User, Check, ExternalLink, Square, Pause } from 'lucide-react';
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
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

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
            duration: video.duration
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
              url: videoData.url,
              duration: videoData.duration
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
      
      // Process each valid file
      for (const file of fileArray) {
        try {
          // Check voice duration
          const duration = await getMediaDuration(file);
          
          // Validate duration (between 8 and 40 seconds)
          if (duration < 8 || duration > 40) {
            toast({
              title: "Invalid voice duration",
              description: `Voice file must be between 8 and 40 seconds (current: ${Math.round(duration)} seconds).`,
              variant: "destructive"
            });
            continue; // Skip this file but process others
          }
          
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
          
          // Include duration in the new voice file object
          const newVoiceFile = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl,
            duration: duration
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
          
          // Update success message to include duration
          toast({
            title: "Voice file uploaded",
            description: `Successfully uploaded ${file.name} (${Math.round(duration)} seconds).`
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

  // Voice recording functions with improved quality
  const startRecording = async () => {
    try {
      // Request high-quality audio stream with improved settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000, // Higher sample rate for better quality
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      audioChunksRef.current = [];
      
      // Setup MediaRecorder with better options for high-quality audio
      const options = { 
        mimeType: 'audio/webm;codecs=opus', // Opus codec for better compression quality
        audioBitsPerSecond: 128000 // Higher bitrate for better quality
      };
      
      // Check if the browser supports the specified MIME type
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } else {
        // Fallback to default settings if not supported
        console.log('Codec not supported, using default settings');
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        // Combine audio chunks into a single blob with appropriate audio type
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        setRecordingBlob(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Reset timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      // Start recording with a longer timeslice for better quality chunks
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          
          // Auto-stop recording if it reaches 40 seconds
          if (newTime >= 40) {
            stopRecording();
          }
          
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check your browser permissions.",
        variant: "destructive"
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  const saveRecording = async () => {
    if (!recordingBlob || !user) return;
    
    try {
      // Validate recording duration
      if (recordingTime < 8) {
        toast({
          title: "Recording too short",
          description: "Voice recording must be at least 8 seconds long.",
          variant: "destructive"
        });
        return;
      }
      
      const uploadId = uuidv4();
      setUploadingVoices(prev => ({ ...prev, [uploadId]: 0 }));
      
      // Create file from blob with higher quality audio file extension
      const fileName = `recorded_voice_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      const filePath = `voices/${user.id}/${uuidv4()}.webm`;
      
      // Upload progress simulation
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
      }, 300);
      
      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('creator_files')
        .upload(filePath, recordingBlob);
        
      clearInterval(progressInterval);
      
      if (uploadError) throw uploadError;
      
      setUploadingVoices(prev => ({ ...prev, [uploadId]: 100 }));
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('creator_files')
        .getPublicUrl(filePath);
      
      // Create voice file object
      const newVoiceFile = {
        id: uuidv4(),
        name: fileName,
        size: recordingBlob.size,
        type: 'audio/webm;codecs=opus',
        url: urlData.publicUrl,
        duration: recordingTime
      };
      
      // Update state
      const updatedVoiceFiles = [...voiceFiles, newVoiceFile];
      setVoiceFiles(updatedVoiceFiles);
      setSelectedVoice(newVoiceFile);
      
      // Clean up
      setTimeout(() => {
        setUploadingVoices(current => {
          const updated = { ...current };
          delete updated[uploadId];
          return updated;
        });
      }, 1000);
      
      // Reset recording state
      setRecordingBlob(null);
      setRecordingTime(0);
      
      // Update user profile
      await updateProfile({
        voice_files: updatedVoiceFiles,
        selected_voice: newVoiceFile
      });
      
      toast({
        title: "Recording saved",
        description: `Successfully saved high quality voice recording (${recordingTime} seconds).`
      });
      
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save voice recording.",
        variant: "destructive"
      });
    }
  };
  
  const discardRecording = () => {
    setRecordingBlob(null);
    setRecordingTime(0);
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
      
      // Update user status to Processing WITHOUT decrementing credits
      await updateProfile({
        status: 'Processing'
      });
      setUserStatus('Processing');
      
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
        throw new Error('Failed to start processing');
      }
      
      // Redirect to results page
      setTimeout(() => {
        navigate('/results');
      }, 2000);
      
    } catch (error) {
      console.error('Error generating content:', error);
      setIsProcessing(false);
      clearInterval(interval);
      setProcessingProgress(0);
      
      // Reset status to Completed in case of error
      if (user) {
        await updateProfile({
          status: 'Completed'
        });
        setUserStatus('Completed');
      }
      
      toast({
        title: "Generation Failed",
        description: "Failed to start content generation. Please try again later.",
        variant: "destructive"
      });
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto pb-12 pt-6">
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Create Video</h1>
              <Button 
                onClick={() => navigate('/results')} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Video className="size-4" />
                View Results
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Video className="size-5" />
                  Upload Target Video
                </h2>
                <p className="text-muted-foreground">
                  Upload a vertical video (MP4) that you want to use as a template for your content.
                  <span className="block mt-1 text-sm font-medium text-blue-600">Video should be between 50-100 seconds.</span>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left side: Video upload */}
                  <div 
                    className={`flex flex-col justify-center items-center border-2 border-dashed rounded-lg p-6 h-64 transition-colors ${isDraggingVideo ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingVideo(true);
                    }}
                    onDragLeave={() => setIsDraggingVideo(false)}
                    onDrop={handleVideoUpload}
                  >
                    <Upload className="size-10 mb-4 text-muted-foreground" />
                    <p className="mb-2 text-sm font-medium">Drag & drop a video file or</p>
                    <input 
                      type="file" 
                      id="video-upload" 
                      accept="video/mp4" 
                      className="hidden" 
                      onChange={handleVideoUpload} 
                    />
                    <label 
                      htmlFor="video-upload" 
                      className="button bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
                    >
                      Choose File
                    </label>
                    <p className="mt-2 text-xs text-muted-foreground">MP4 format, max 30MB</p>
                  </div>
                  
                  {/* Right side: Uploaded videos */}
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                    <h3 className="font-medium mb-2">Your Videos ({videos.length}/5)</h3>
                    {videos.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No videos uploaded yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {videos.map((video) => (
                          <li key={video.id} className={`relative border rounded-md p-2 text-sm flex justify-between items-center ${selectedVideo?.id === video.id ? 'bg-primary/10 border-primary' : ''}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Video className="size-4 flex-shrink-0" />
                              <span className="truncate">{video.name}</span>
                              {video.duration && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                                  {Math.round(video.duration)}s
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {selectedVideo?.id === video.id ? (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" disabled>
                                  <Check className="size-3.5" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 hover:text-primary" 
                                  onClick={() => handleSelectVideo(video)}
                                >
                                  <Check className="size-3.5" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 hover:text-destructive" 
                                onClick={() => handleRemoveVideo(video.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {Object.keys(uploadingVideos).length > 0 && (
                      <div className="mt-2 space-y-2">
                        {Object.entries(uploadingVideos).map(([id, progress]) => (
                          <div key={id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Uploading...</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Mic className="size-5" />
                  Upload or Record Voice
                </h2>
                <p className="text-muted-foreground">
                  Upload an audio recording of your voice that will be used for the generated content.
                  <span className="block mt-1 text-sm font-medium text-blue-600">Voice recording should be between 8-40 seconds.</span>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left side: Upload voice */}
                  <div 
                    className={`flex flex-col justify-center items-center border-2 border-dashed rounded-lg p-6 h-64 transition-colors ${isDraggingVoice ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingVoice(true);
                    }}
                    onDragLeave={() => setIsDraggingVoice(false)}
                    onDrop={handleVoiceUpload}
                  >
                    <Upload className="size-10 mb-4 text-muted-foreground" />
                    <p className="mb-2 text-sm font-medium">Drag & drop an audio file or</p>
                    <input 
                      type="file" 
                      id="voice-upload" 
                      accept="audio/mpeg,audio/wav" 
                      className="hidden" 
                      onChange={handleVoiceUpload} 
                    />
                    <label 
                      htmlFor="voice-upload" 
                      className="button bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
                    >
                      Choose File
                    </label>
                    <p className="mt-2 text-xs text-muted-foreground">MP3 or WAV format, max 8MB</p>
                  </div>
                  
                  {/* Right side: Record your voice */}
                  <div className="flex flex-col border-2 border-dashed rounded-lg p-6 h-64 transition-colors hover:border-primary/50">
                    <div className="flex flex-col flex-grow justify-center items-center">
                      {!recordingBlob ? (
                        <>
                          <Mic className={`size-10 mb-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
                          <p className="mb-2 text-sm font-medium">
                            {isRecording ? `Recording: ${recordingTime}s` : "Record your voice"}
                          </p>
                          <div className="flex gap-2">
                            {isRecording ? (
                              <Button
                                type="button"
                                onClick={stopRecording}
                                variant="destructive"
                                className="flex items-center gap-1.5"
                              >
                                <Square className="size-3.5" />
                                Stop Recording
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                onClick={startRecording}
                                variant="default"
                                className="flex items-center gap-1.5"
                              >
                                <Mic className="size-3.5" />
                                Start Recording
                              </Button>
                            )}
                          </div>
                          {isRecording && (
                            <p className="mt-2 text-xs text-red-500">Recording will automatically stop after 40 seconds</p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-center">
                            <div className="inline-flex items-center justify-center size-16 bg-primary/10 rounded-full mb-4">
                              <Mic className="size-8 text-primary" />
                            </div>
                            <p className="font-medium mb-2">Voice Recorded</p>
                            <p className="text-sm text-muted-foreground mb-4">
                              {recordingTime} seconds
                            </p>
                            <div className="flex gap-2 justify-center">
                              <Button
                                type="button"
                                onClick={saveRecording}
                                variant="default"
                                className="flex items-center gap-1.5"
                              >
                                <Check className="size-3.5" />
                                Save Recording
                              </Button>
                              <Button
                                type="button"
                                onClick={discardRecording}
                                variant="outline"
                                className="flex items-center gap-1.5"
                              >
                                <Trash2 className="size-3.5" />
                                Discard
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Voice files list */}
                  <div className="col-span-1 md:col-span-2 border rounded-lg p-4 max-h-64 overflow-y-auto">
                    <h3 className="font-medium mb-2">Your Voice Files ({voiceFiles.length}/5)</h3>
                    {voiceFiles.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No voice files uploaded yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {voiceFiles.map((file) => (
                          <li key={file.id} className={`relative border rounded-md p-2 text-sm flex justify-between items-center ${selectedVoice?.id === file.id ? 'bg-primary/10 border-primary' : ''}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Mic className="size-4 flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                              {file.duration && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                                  {Math.round(file.duration)}s
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {selectedVoice?.id === file.id ? (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" disabled>
                                  <Check className="size-3.5" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 hover:text-primary" 
                                  onClick={() => handleSelectVoice(file)}
                                >
                                  <Check className="size-3.5" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 hover:text-destructive" 
                                onClick={() => handleRemoveVoiceFile(file.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {Object.keys(uploadingVoices).length > 0 && (
                      <div className="mt-2 space-y-2">
                        {Object.entries(uploadingVoices).map(([id, progress]) => (
                          <div key={id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Uploading...</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Briefcase className="size-5" />
                  Choose Your Niches
                </h2>
                <p className="text-muted-foreground">
                  Select the niches that are most relevant to your content.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {niches.map((niche) => (
                    <button
                      key={niche}
                      type="button"
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedNiches.includes(niche) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      onClick={() => handleNicheChange(niche)}
                    >
                      {niche}
                    </button>
                  ))}
                </div>
              </Card>
              
              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <User className="size-5" />
                  Add Competitor Usernames
                </h2>
                <p className="text-muted-foreground">
                  Add usernames of creators in your niche to help us generate content similar to theirs.
                </p>
                
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      placeholder="@username"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <Button type="button" onClick={handleAddCompetitor} disabled={newCompetitor.trim() === ''}>
                      <Plus className="size-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Added Competitors ({competitors.length}/15)</h3>
                    {competitors.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No competitors added yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {competitors.map((competitor, index) => (
                          <div key={index} className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full text-sm">
                            <span>{competitor}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCompetitor(index)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              
              <div className="flex justify-end gap-4">
                <Button
                  type="submit"
                  disabled={isProcessing || userStatus === 'Processing' || videos.length === 0 || voiceFiles.length === 0 || selectedNiches.length === 0 || competitors.length === 0 || !selectedVideo || !selectedVoice}
                  className="min-w-32"
                >
                  {isProcessing ? (
                    <>
                      <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>Generate Video</>
                  )}
                </Button>
              </div>
              
              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-center text-sm text-muted-foreground">
                    Please wait while we process your request...
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
