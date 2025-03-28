import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Video, Loader } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type ResultVideo = {
  url: string;
  timestamp: string;
};

const Results = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [resultVideos, setResultVideos] = useState<ResultVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingStatus, setProcessingStatus] = useState(false);

  useEffect(() => {
    const fetchUserResults = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('result, status')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your results.',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        // Check if status is processing
        if (profileData.status === 'Processing') {
          setProcessingStatus(true);
        } else {
          setProcessingStatus(false);
        }

        if (profileData.result) {
          const typedResults: ResultVideo[] = [];
          
          // Handle different types of result data
          const resultArray = Array.isArray(profileData.result) 
            ? profileData.result 
            : (typeof profileData.result === 'string' ? JSON.parse(profileData.result) : []);
          
          for (const item of resultArray) {
            if (typeof item === 'string') {
              typedResults.push({
                url: item,
                timestamp: new Date().toISOString()
              });
            } else if (typeof item === 'object' && item !== null) {
              const resultItem = item as any;
              if (resultItem.url && resultItem.timestamp) {
                typedResults.push({
                  url: resultItem.url,
                  timestamp: resultItem.timestamp
                });
              } else if (resultItem.url) {
                typedResults.push({
                  url: resultItem.url,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
          
          setResultVideos(typedResults.reverse()); // Show newest first
        }
      } catch (error) {
        console.error('Error loading results:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserResults();
  }, [user, toast]);

  if (isLoading) {
    return (
      <MainLayout title="Your Results" subtitle="Loading your generated videos...">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Your Results" subtitle="View all your generated videos">
      <div className="section-container py-12">
        {processingStatus && (
          <Card className="mb-8 bg-amber-50 border-amber-200">
            <div className="p-4">
              <h3 className="text-lg font-medium text-amber-800 mb-2">Video Processing in Progress</h3>
              <p className="text-amber-700">
                We're currently processing your most recent video request. You'll be able to generate a new video once it's complete.
              </p>
              <Progress className="mt-4 h-2" value={75} />
            </div>
          </Card>
        )}
        
        {resultVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resultVideos.map((video, index) => (
              <Card key={index} className="overflow-hidden animate-fade-in">
                <div className="relative">
                  {processingStatus && index === 0 ? (
                    <div className="relative bg-gray-200 w-full">
                      <div className="w-full py-[56.25%] relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400">
                          {/* Visual pattern to make it look like a frame */}
                          <div className="absolute inset-0 opacity-10" 
                               style={{backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 0, 0, .2) 25%, rgba(0, 0, 0, .2) 26%, transparent 27%, transparent 74%, rgba(0, 0, 0, .2) 75%, rgba(0, 0, 0, .2) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 0, 0, .2) 25%, rgba(0, 0, 0, .2) 26%, transparent 27%, transparent 74%, rgba(0, 0, 0, .2) 75%, rgba(0, 0, 0, .2) 76%, transparent 77%, transparent)', 
                                backgroundSize: '50px 50px'}}>
                          </div>
                        </div>
                        
                        {/* Processing indicator overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-white p-6">
                          <Loader className="h-10 w-10 animate-spin mb-3" />
                          <h3 className="text-lg font-medium mb-2">We are processing your video</h3>
                          <p className="text-sm opacity-90">Please wait until it's completed.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full bg-black flex justify-center">
                      <video 
                        src={video.url} 
                        className="max-w-full max-h-[400px] object-contain" 
                        controls 
                      />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2">Generated Video {index + 1}</h3>
                  
                  {!(processingStatus && index === 0) && (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        {new Date(video.timestamp).toLocaleString()}
                      </p>
                      <div className="flex space-x-2">
                        <a 
                          href={video.url} 
                          download={`video-${index}.mp4`}
                          className="text-sm text-primary hover:underline"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          className="text-sm text-primary hover:underline"
                          onClick={() => {
                            navigator.clipboard.writeText(video.url);
                            toast({
                              title: "Link copied",
                              description: "Video link copied to clipboard",
                            });
                          }}
                        >
                          Copy Link
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center">
            <Video className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-medium mb-2">No results yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              You haven't generated any videos yet. Go to the dashboard and create your first personalized video.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Results;
