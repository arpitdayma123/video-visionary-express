
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ErrorMessage from '@/components/dashboard/ErrorMessage';
import VideoSubmitForm from '@/components/dashboard/VideoSubmitForm';

const Dashboard = () => {
  const { user } = useAuth();
  const {
    videos,
    voiceFiles,
    selectedVideo,
    selectedVoice,
    selectedNiches,
    competitors,
    userCredits,
    userStatus,
    errorMessage,
    scriptOption,
    customScript,
    isLoading,
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
  } = useDashboardData(user);
  
  return (
    <MainLayout title="Creator Dashboard" subtitle="Upload your content and create personalized videos">
      <div className="section-container py-12">
        <ErrorMessage errorMessage={errorMessage} userStatus={userStatus} />
        <DashboardHeader userCredits={userCredits} userStatus={userStatus} />
        
        <VideoSubmitForm
          videos={videos}
          voiceFiles={voiceFiles}
          selectedVideo={selectedVideo}
          selectedVoice={selectedVoice}
          selectedNiches={selectedNiches}
          competitors={competitors}
          userId={user?.id}
          userCredits={userCredits}
          userStatus={userStatus}
          scriptOption={scriptOption}
          customScript={customScript}
          setVideos={setVideos}
          setVoiceFiles={setVoiceFiles}
          setSelectedVideo={setSelectedVideo}
          setSelectedVoice={setSelectedVoice}
          setSelectedNiches={setSelectedNiches}
          setCompetitors={setCompetitors}
          setScriptOption={setScriptOption}
          setCustomScript={setCustomScript}
          setUserStatus={setUserStatus}
          updateProfile={updateProfile}
        />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
