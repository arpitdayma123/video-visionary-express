
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
    reelUrl,
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
    setReelUrl,
    setUserStatus
  } = useDashboardData(user);

  if (isLoading) {
    return (
      <MainLayout title="Creator Dashboard" subtitle="Loading your content...">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  // Handle script confirmation
  const handleScriptConfirmed = (script: string) => {
    console.log("Script confirmed in Dashboard:", script.substring(0, 50) + "...");
    // Any additional dashboard level script handling could go here
  };
  
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
          reelUrl={reelUrl}
          setVideos={setVideos}
          setVoiceFiles={setVoiceFiles}
          setSelectedVideo={setSelectedVideo}
          setSelectedVoice={setSelectedVoice}
          setSelectedNiches={setSelectedNiches}
          setCompetitors={setCompetitors}
          setScriptOption={setScriptOption}
          setCustomScript={setCustomScript}
          setReelUrl={setReelUrl}
          setUserStatus={setUserStatus}
          updateProfile={updateProfile}
          onScriptConfirmed={handleScriptConfirmed}
        />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
