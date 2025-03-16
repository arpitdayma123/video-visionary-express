
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

  // Voice recording functions
  const startRecording = async () => {
    try {
      // Request higher quality audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 2, // Stereo for better quality
          echoCancellation: true, // Enable echo cancellation for clearer voice
          noiseSuppression: true, // Enable noise suppression for cleaner audio
          autoGainControl: true // Enable automatic gain control for consistent volume
        } 
      });
      
      audioChunksRef.current = [];
      
      // Add a small delay to ensure the microphone is fully initialized
      setTimeout(() => {
        // Use higher bitrate and quality settings
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 256000 // Increased bitrate for higher quality
        });
        
        mediaRecorderRef.current = mediaRecorder;
        
        // Collect audio data more frequently for better fidelity
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          // Create blob with the highest quality option
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
        
        // Start recording with smaller timeslice for more frequent ondataavailable events
        mediaRecorder.start(100);
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
      }, 500); // Add 500ms delay before starting recording to prevent initial trimming
      
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
      // Add a buffer at the end to prevent trimming the end of the recording
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          
          // Clear timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 1000); // 1 second delay to prevent trimming at the end
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
      
      // Create file from blob using the higher quality format
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
      
      // Create voice file object with adjusted duration to account for buffers
      const newVoiceFile = {
        id: uuidv4(),
        name: fileName,
        size: recordingBlob.size,
        type: 'audio/webm',
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
        description: `Successfully saved voice recording (${recordingTime} seconds).`
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
          <div className="flex items-center gap-4">
            <div className="bg-secondary/40 px-4 py-2 rounded-lg">
              <span className="text-sm mr-2">Credits:</span>
              <span className="font-medium">{userCredits}</span>
            </div>
            {userStatus === 'Processing' && (
              <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 px-4 py-2 rounded-lg flex items-center">
                <span className="text-sm">Video processing in progress...</span>
              </div>
            )}
          </div>
          <Button
            onClick={() => navigate('/credits')}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            Buy Credits
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Video Upload Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">Target Video</h2>
                <span className="text-xs text-muted-foreground">MP4 files only, max 30MB</span>
              </div>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDraggingVideo ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingVideo(true);
                }}
                onDragLeave={() => setIsDraggingVideo(false)}
                onDrop={handleVideoUpload}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop video files here or <label className="text-primary cursor-pointer">browse files</label>
                  </p>
                  <input 
                    type="file"
                    accept="video/mp4"
                    className="hidden"
                    onChange={handleVideoUpload}
                    id="video-upload"
                  />
                  <label 
                    htmlFor="video-upload"
                    className="px-4 py-2 bg-primary/10 text-primary rounded-md text-sm cursor-pointer"
                  >
                    Select Video
                  </label>
                </div>
              </div>
              
              {Object.keys(uploadingVideos).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(uploadingVideos).map(([id, progress]) => (
                    <div key={id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Uploading video...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1" />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Your Videos ({videos.length}/5)</h3>
                {videos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No videos uploaded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {videos.map((video) => (
                      <div 
                        key={video.id}
                        className={`flex items-center justify-between p-2 rounded-md ${selectedVideo?.id === video.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Video className="h-4 w-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{video.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round(video.size / 1024 / 1024 * 10) / 10} MB
                              {video.duration && ` • ${Math.round(video.duration)}s`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {selectedVideo?.id !== video.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSelectVideo(video)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveVideo(video.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
            
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">Target Voice</h2>
                <span className="text-xs text-muted-foreground">MP3/WAV files only, max 8MB</span>
              </div>
              
              <div className="flex flex-col lg:flex-row items-center gap-4 mb-4">
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors flex-1 w-full ${isDraggingVoice ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingVoice(true);
                  }}
                  onDragLeave={() => setIsDraggingVoice(false)}
                  onDrop={handleVoiceUpload}
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop voice files here or <label className="text-primary cursor-pointer">browse files</label>
                    </p>
                    <input 
                      type="file"
                      accept="audio/mpeg,audio/wav"
                      className="hidden"
                      onChange={handleVoiceUpload}
                      id="voice-upload"
                    />
                    <label 
                      htmlFor="voice-upload"
                      className="px-4 py-2 bg-primary/10 text-primary rounded-md text-sm cursor-pointer"
                    >
                      Select Voice File
                    </label>
                  </div>
                </div>
                
                <div className="border-2 rounded-lg p-6 text-center flex-1 w-full">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Mic className={`h-8 w-8 ${isRecording ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                    <p className="text-sm text-muted-foreground">
                      {isRecording ? `Recording: ${recordingTime}s` : 'Or record your voice directly'}
                    </p>
                    
                    {!isRecording && !recordingBlob && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary hover:bg-primary/10"
                        onClick={startRecording}
                      >
                        Start Recording
                      </Button>
                    )}
                    
                    {isRecording && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={stopRecording}
                      >
                        Stop Recording
                      </Button>
                    )}
                    
                    {!isRecording && recordingBlob && (
                      <div className="flex flex-col space-y-2">
                        <p className="text-xs">
                          Recording: {recordingTime} seconds
                        </p>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={saveRecording}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={discardRecording}
                          >
                            Discard
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {Object.keys(uploadingVoices).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(uploadingVoices).map(([id, progress]) => (
                    <div key={id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Uploading voice file...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1" />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Your Voice Files ({voiceFiles.length}/5)</h3>
                {voiceFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No voice files uploaded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {voiceFiles.map((file) => (
                      <div 
                        key={file.id}
                        className={`flex items-center justify-between p-2 rounded-md ${selectedVoice?.id === file.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Mic className="h-4 w-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round(file.size / 1024 / 1024 * 10) / 10} MB
                              {file.duration && ` • ${Math.round(file.duration)}s`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {selectedVoice?.id !== file.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSelectVoice(file)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveVoiceFile(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          {/* Niche Selection */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-medium">Select Your Niches</h2>
            <p className="text-sm text-muted-foreground">Choose the content niches that best describe your content</p>
            
            <div className="flex flex-wrap gap-2">
              {niches.map((niche) => (
                <Button
                  key={niche}
                  type="button"
                  variant={selectedNiches.includes(niche) ? "default" : "outline"}
                  size="sm"
                  className={selectedNiches.includes(niche) ? "" : "border-muted-foreground/30"}
                  onClick={() => handleNicheChange(niche)}
                >
                  {niche}
                </Button>
              ))}
            </div>
          </Card>
          
          {/* Competitor Usernames */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-medium">Competitor Usernames</h2>
            <p className="text-sm text-muted-foreground">Enter usernames of content creators in your niche to analyze their content</p>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                placeholder="Enter username"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                maxLength={30}
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={handleAddCompetitor}
                className="flex-shrink-0"
                disabled={newCompetitor.trim() === '' || competitors.length >= 15}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            <div className="space-y-2">
              {competitors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No competitors added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {competitors.map((competitor, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-1 bg-muted px-3 py-1 rounded-md"
                    >
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{competitor}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCompetitor(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!isFormComplete || isProcessing || userCredits < 1 || userStatus === 'Processing'}
              className="px-8"
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                  Processing...
                </>
              ) : userStatus === 'Processing' ? (
                'Processing previous video...'
              ) : userCredits < 1 ? (
                'Need Credits'
              ) : (
                'Generate Video'
              )}
            </Button>
          </div>
          
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Processing video...</span>
                <span>{processingProgress}%</span>
              </div>
              <Progress value={processingProgress} className="h-2" />
            </div>
          )}
        </form>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
