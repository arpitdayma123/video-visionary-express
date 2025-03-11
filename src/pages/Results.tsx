
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Video } from 'lucide-react';

type ResultVideo = {
  url: string;
  timestamp: string;
};

const Results = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [resultVideos, setResultVideos] = useState<ResultVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserResults = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('result')
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
        {resultVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resultVideos.map((video, index) => (
              <Card key={index} className="overflow-hidden animate-fade-in">
                <div className="aspect-video w-full">
                  <video 
                    src={video.url} 
                    className="w-full h-full object-cover" 
                    controls 
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2">Generated Video {index + 1}</h3>
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
