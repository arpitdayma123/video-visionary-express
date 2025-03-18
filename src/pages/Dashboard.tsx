
import React, { useEffect } from 'react';
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
    loadError,
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

  useEffect(() => {
    console.log('Dashboard state:', { 
      isLoading, 
      userCredits, 
      userStatus, 
      loadError,
      user: user ? 'authenticated' : 'not authenticated' 
    });
  }, [isLoading, userCredits, userStatus, loadError, user]);

  if (isLoading) {
    return (
      <MainLayout title="Creator Dashboard" subtitle="Loading your content...">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading your dashboard data...</p>
          {loadError && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md max-w-md">
              <p>Error loading data: {loadError}</p>
              <p className="text-sm mt-2">Please try refreshing the page.</p>
            </div>
          )}
        </div>
      </MainLayout>
    );
  }
  
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
