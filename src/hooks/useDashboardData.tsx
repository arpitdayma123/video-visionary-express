
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@supabase/supabase-js';

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration?: number;
};

export type DashboardData = {
  videos: UploadedFile[];
  voiceFiles: UploadedFile[];
  selectedVideo: UploadedFile | null;
  selectedVoice: UploadedFile | null;
  selectedNiches: string[];
  competitors: string[];
  userCredits: number;
  userStatus: string;
  errorMessage: string | null;
  scriptOption: string;
  customScript: string;
  isLoading: boolean;
};

export const useDashboardData = (user: User | null) => {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData>({
    videos: [],
    voiceFiles: [],
    selectedVideo: null,
    selectedVoice: null,
    selectedNiches: [],
    competitors: [],
    userCredits: 0,
    userStatus: 'Completed',
    errorMessage: null,
    scriptOption: 'ai_find',
    customScript: '',
    isLoading: true
  });

  useEffect(() => {
    if (!user) {
      setData(prev => ({ ...prev, isLoading: false }));
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
          setData(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        console.log("Profile loaded:", profile);
        
        const updatedData = { ...data, isLoading: false };
        
        // Set user credits
        updatedData.userCredits = profile.credit || 0;
        
        // Set user status
        updatedData.userStatus = profile.status || 'Completed';
        
        // Set error message if status is Failed
        if (profile.status === 'Failed' && profile.message) {
          updatedData.errorMessage = profile.message;
        }
        
        if (profile.videos && profile.videos.length > 0) {
          updatedData.videos = profile.videos.map((video: any) => ({
            id: video.id || uuidv4(),
            name: video.name,
            size: video.size,
            type: video.type,
            url: video.url,
            duration: video.duration
          }));
        }
        
        if (profile.voice_files && profile.voice_files.length > 0) {
          updatedData.voiceFiles = profile.voice_files.map((file: any) => ({
            id: file.id || uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: file.url
          }));
        }
        
        if (profile.selected_niches && profile.selected_niches.length > 0) {
          updatedData.selectedNiches = profile.selected_niches;
        }
        
        if (profile.competitors && profile.competitors.length > 0) {
          updatedData.competitors = profile.competitors;
        }
        
        if (profile.selected_video && typeof profile.selected_video === 'object') {
          const videoData = profile.selected_video as any;
          if (videoData.id && videoData.name && videoData.url) {
            updatedData.selectedVideo = {
              id: videoData.id,
              name: videoData.name,
              size: videoData.size || 0,
              type: videoData.type || 'video/mp4',
              url: videoData.url,
              duration: videoData.duration
            };
          }
        }
        
        if (profile.selected_voice && typeof profile.selected_voice === 'object') {
          const voiceData = profile.selected_voice as any;
          if (voiceData.id && voiceData.name && voiceData.url) {
            updatedData.selectedVoice = {
              id: voiceData.id,
              name: voiceData.name,
              size: voiceData.size || 0,
              type: voiceData.type || 'audio/mpeg',
              url: voiceData.url
            };
          }
        }
        
        // Load script option and custom script if available
        if (profile.script_option) {
          updatedData.scriptOption = profile.script_option;
        }
        
        if (profile.custom_script) {
          updatedData.customScript = profile.custom_script;
        }
        
        setData(updatedData);
      } catch (error) {
        console.error('Unexpected error loading profile:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred.',
          variant: 'destructive'
        });
        setData(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    loadUserProfile();
  }, [user, toast]);

  const updateProfile = async (updates: any) => {
    if (!user) return;
    try {
      console.log('Updating profile with:', updates);
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update your profile.',
        variant: 'destructive'
      });
    }
  };
  
  const setVideos = (newVideos: UploadedFile[]) => {
    setData(prev => ({ ...prev, videos: newVideos }));
  };
  
  const setVoiceFiles = (newVoiceFiles: UploadedFile[]) => {
    setData(prev => ({ ...prev, voiceFiles: newVoiceFiles }));
  };
  
  const setSelectedVideo = (video: UploadedFile | null) => {
    setData(prev => ({ ...prev, selectedVideo: video }));
  };
  
  const setSelectedVoice = (voice: UploadedFile | null) => {
    setData(prev => ({ ...prev, selectedVoice: voice }));
  };
  
  const setSelectedNiches = (niches: string[]) => {
    setData(prev => ({ ...prev, selectedNiches: niches }));
  };
  
  const setCompetitors = (newCompetitors: string[]) => {
    setData(prev => ({ ...prev, competitors: newCompetitors }));
  };
  
  const setScriptOption = (option: string) => {
    setData(prev => ({ ...prev, scriptOption: option }));
  };
  
  const setCustomScript = (script: string) => {
    setData(prev => ({ ...prev, customScript: script }));
  };
  
  const setUserStatus = (status: string) => {
    setData(prev => ({ ...prev, userStatus: status }));
  };

  return {
    ...data,
    updateProfile,
    setVideos,
    setVoiceFiles,
    setSelectedVideo,
    setSelectedVoice,
    setSelectedNiches,
    setCompetitors,
    setScriptOption,
    setCustomScript,
    setUserStatus
  };
};
