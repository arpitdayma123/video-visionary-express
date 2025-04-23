
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UploadedFile } from '@/hooks/useDashboardData';
import VideoUpload from './VideoUpload';
import VoiceUpload from './VoiceUpload';
import NicheSelection from './NicheSelection';
import CompetitorInput from './CompetitorInput';
import GenerateVideo from './GenerateVideo';
import ScriptSelection from './ScriptSelection';
import FormContainer from './form/FormContainer';
import { useScriptHandler } from './form/ScriptHandler';
import FormSubmissionHandler from './form/FormSubmissionHandler';

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
  reelUrl: string;
  setVideos: (videos: UploadedFile[]) => void;
  setVoiceFiles: (voiceFiles: UploadedFile[]) => void;
  setSelectedVideo: (video: UploadedFile | null) => void;
  setSelectedVoice: (voice: UploadedFile | null) => void;
  setSelectedNiches: (niches: string[]) => void;
  setCompetitors: (competitors: string[]) => void;
  setScriptOption: (option: string) => void;
  setCustomScript: (script: string) => void;
  setReelUrl: (url: string) => void;
  setUserStatus: (status: string) => void;
  updateProfile: (updates: any) => Promise<void>;
  onScriptConfirmed?: (script: string) => void;
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
  reelUrl,
  setVideos,
  setVoiceFiles,
  setSelectedVideo,
  setSelectedVoice,
  setSelectedNiches,
  setCompetitors,
  setScriptOption,
  setCustomScript,
  setReelUrl,
  setUserStatus,
  updateProfile,
  onScriptConfirmed,
}: VideoSubmitFormProps) => {
  // State for script management
  const [isScriptSelected, setIsScriptSelected] = useState(false);
  const [previewScriptContent, setPreviewScriptContent] = useState('');
  const [isScriptPreviewVisible, setIsScriptPreviewVisible] = useState(false);
  const [hasFinalizedPreviewScript, setHasFinalizedPreviewScript] = useState(false);

  // Reset preview script content and visibility when script option changes
  useEffect(() => {
    console.log('VideoSubmitForm - Script option changed to:', scriptOption);
    
    // On switch to ai_find/ig_reel, reset preview script and visibility
    if (scriptOption === 'ai_find' || scriptOption === 'ig_reel') {
      setIsScriptPreviewVisible(false);
      setPreviewScriptContent('');
      setHasFinalizedPreviewScript(false);
    } else {
      setIsScriptPreviewVisible(true);
      setPreviewScriptContent('');
      setHasFinalizedPreviewScript(true); // For non-preview options; always finalized
    }
  }, [scriptOption]);

  // Use the ScriptHandler hooks - Now using the hook instead of the component
  const scriptHandler = useScriptHandler({
    userId,
    scriptOption,
    customScript,
    previewScriptContent,
    isScriptPreviewVisible, 
    hasFinalizedPreviewScript,
    setPreviewScriptContent,
    setHasFinalizedPreviewScript,
    setIsScriptSelected,
    onScriptConfirmed
  });

  // Use FormSubmissionHandler for handling form submission
  const handleSubmit = FormSubmissionHandler({
    userId,
    videos,
    voiceFiles,
    selectedVideo,
    selectedVoice,
    selectedNiches,
    competitors,
    scriptOption,
    customScript,
    reelUrl,
    previewScriptContent,
    hasFinalizedPreviewScript,
    isScriptPreviewVisible,
    userCredits,
    userStatus,
    setUserStatus,
    updateProfile,
    saveScriptForGeneration: scriptHandler.saveScriptForGeneration
  });

  // Eligibility for "Generate Video" button:
  // For ai_find/ig_reel: require "Use This Script" has been clicked at least once (hasFinalizedPreviewScript)
  // For other options: customScript as before
  const isFormComplete = Boolean(
    videos.length > 0 &&
    voiceFiles.length > 0 &&
    selectedNiches.length > 0 &&
    competitors.length > 0 &&
    selectedVideo !== null &&
    selectedVoice !== null &&
    (
      (scriptOption === 'ai_find' || scriptOption === 'ig_reel')
        ? hasFinalizedPreviewScript
        : customScript
    ) &&
    (scriptOption !== 'ig_reel' || (scriptOption === 'ig_reel' && reelUrl))
  );

  // Debug logging of the script preview state
  console.log('VideoSubmitForm - Script Preview Status:', {
    scriptOption,
    isScriptPreviewVisible,
    previewScriptContentExists: !!previewScriptContent,
    hasFinalizedPreviewScript,
    isFormComplete
  });

  return (
    <FormContainer onSubmit={handleSubmit}>
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

      <ScriptSelection
        scriptOption={scriptOption}
        customScript={customScript}
        setScriptOption={setScriptOption}
        setCustomScript={setCustomScript}
        updateProfile={updateProfile}
        onScriptConfirmed={scriptHandler.handleScriptConfirmed}
        onScriptPreviewVisible={scriptHandler.handleScriptPreviewVisible}
      />

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
        isScriptSelected={isScriptSelected}
        isScriptPreviewVisible={isScriptPreviewVisible}
        scriptOption={scriptOption}
      />
    </FormContainer>
  );
};

export default VideoSubmitForm;
