import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import VideoUpload from './VideoUpload';
import VoiceUpload from './VoiceUpload';
import NicheSelection from './NicheSelection';
import CompetitorInput from './CompetitorInput';
import GenerateVideo from './GenerateVideo';
import ScriptSelection from './ScriptSelection';
import { UploadedFile } from '@/hooks/useDashboardData';

interface VideoSubmitFormProps {
  videos: UploadedFile[];
  voiceFiles: UploadedFile[];
  selectedVideo: UploadedFile | null;
  selectedVoice: UploadedFile | null;
  selectedNiches: string[];
  competitors: string[];
  userId: string | undefined;
  userCredits: number;
  userStatus: string;
  scriptOption: string;
  customScript: string;
  setVideos: (videos: UploadedFile[]) => void;
  setVoiceFiles: (voiceFiles: UploadedFile[]) => void;
  setSelectedVideo: (video: UploadedFile | null) => void;
  setSelectedVoice: (voice: UploadedFile | null) => void;
  setSelectedNiches: (niches: string[]) => void;
  setCompetitors: (competitors: string[]) => void;
  setScriptOption: (option: string) => void;
  setCustomScript: (script: string) => void;
  setUserStatus: (status: string) => void;
  updateProfile: (updates: any) => Promise<void>;
}

const VideoSubmitForm = ({
  videos,
  voiceFiles,
  selectedVideo,
  selectedVoice,
  selectedNiches,
  competitors,
  userId,
  userCredits,
  userStatus,
  scriptOption,
  customScript,
  setVideos,
  setVoiceFiles,
  setSelectedVideo,
  setSelectedVoice,
  setSelectedNiches,
  setCompetitors,
  setScriptOption,
  setCustomScript,
  setUserStatus,
  updateProfile
}: VideoSubmitFormProps) => {
  const { toast } = useToast();
  
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
    
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Update user status to Processing but don't deduct credits (will be done by webhook)
      await updateProfile({
        status: 'Processing'
      });
      setUserStatus('Processing');
      
      const params = new URLSearchParams({
        userId: userId,
        scriptOption: scriptOption,
        customScript: (scriptOption === 'custom' || scriptOption === 'ai_remake') ? customScript : ''
      });
      
      // Improved fetch with better error handling and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      console.log(`Sending webhook request to: https://primary-production-ce25.up.railway.app/webhook/trendy?${params.toString()}`);
      
      const response = await fetch(`https://primary-production-ce25.up.railway.app/webhook/trendy?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal,
        credentials: 'omit', // Don't send cookies with the request
        mode: 'cors', // Enable CORS
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Get error details
        let errorDetails;
        try {
          errorDetails = await response.text();
        } catch (e) {
          errorDetails = 'Unable to get error details';
        }
        
        console.error('Webhook response error:', response.status, errorDetails);
        throw new Error(`Server responded with status: ${response.status}. Details: ${errorDetails}`);
      }
      
      const responseData = await response.json();
      console.log('Webhook response:', responseData);
      
      toast({
        title: "Request sent successfully",
        description: "Your personalized video is being processed. Please check the Results page after 5 minutes to see your video."
      });
      
    } catch (error) {
      console.error('Error processing video:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = "There was an error processing your request.";
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        errorMessage = "Request timed out. Please try again later.";
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      // Revert status back to Completed if there was an error
      await updateProfile({
        status: 'Completed'
      });
      setUserStatus('Completed');
      
      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const isFormComplete = videos.length > 0 && voiceFiles.length > 0 && selectedNiches.length > 0 && competitors.length > 0 && selectedVideo !== null && selectedVoice !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Video Upload Section */}
      <VideoUpload 
        videos={videos} 
        setVideos={setVideos} 
        selectedVideo={selectedVideo} 
        setSelectedVideo={setSelectedVideo} 
        userId={userId || ''} 
        updateProfile={updateProfile} 
      />

      {/* Voice Upload Section */}
      <VoiceUpload 
        voiceFiles={voiceFiles} 
        setVoiceFiles={setVoiceFiles} 
        selectedVoice={selectedVoice} 
        setSelectedVoice={setSelectedVoice} 
        userId={userId || ''} 
        updateProfile={updateProfile} 
      />

      {/* Niche Selection Section */}
      <NicheSelection 
        selectedNiches={selectedNiches} 
        setSelectedNiches={setSelectedNiches} 
        updateProfile={updateProfile} 
      />

      {/* Competitor Section */}
      <CompetitorInput 
        competitors={competitors} 
        setCompetitors={setCompetitors} 
        updateProfile={updateProfile} 
      />
      
      {/* Script Selection Section */}
      <ScriptSelection
        scriptOption={scriptOption}
        customScript={customScript}
        setScriptOption={setScriptOption}
        setCustomScript={setCustomScript}
        updateProfile={updateProfile}
      />

      {/* Submit Section */}
      <GenerateVideo 
        isFormComplete={isFormComplete} 
        userCredits={userCredits} 
        userStatus={userStatus} 
        userId={userId}
        onSubmit={handleSubmit} 
        videos={videos}
        voiceFiles={voiceFiles}
        selectedVideo={selectedVideo}
        selectedVoice={selectedVoice}
        selectedNiches={selectedNiches}
        competitors={competitors}
      />
    </form>
  );
};

export default VideoSubmitForm;
