
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock } from 'lucide-react';

const Tutorial = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [buttonEnabled, setButtonEnabled] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          clearInterval(timer);
          setButtonEnabled(true);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSkipTutorial = async () => {
    if (!buttonEnabled) return;
    
    setLoading(true);
    
    // Mark the user as having seen the tutorial
    if (user) {
      try {
        // Use update with typesafe fields
        const { error } = await supabase
          .from('profiles')
          .update({
            // Using a cast to inform TypeScript that we know what we're doing
            // This is a workaround until the types are updated
            "has_seen_tutorial": true
          } as any)
          .eq('id', user.id);
          
        if (error) {
          console.error('Error updating profile:', error);
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    }
    
    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <MainLayout title="Welcome Tutorial" subtitle="Learn how to create your first video" showNav={false}>
      <div className="section-container flex flex-col items-center py-8">
        <div className="w-full max-w-4xl mb-8">
          <div style={{position: 'relative', paddingTop: '56.25%'}}>
            <iframe 
              src="https://iframe.mediadelivery.net/embed/402462/5965a119-cb3c-4b63-937f-a661531775c1?autoplay=true&loop=false&muted=false&preload=true&responsive=true" 
              loading="lazy" 
              style={{border: 0, position: 'absolute', top: 0, height: '100%', width: '100%'}} 
              allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;" 
              allowFullScreen={true}
            />
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4 mt-6">
          <Button 
            onClick={handleSkipTutorial} 
            variant="default" 
            size="lg"
            disabled={loading || !buttonEnabled}
            className="relative"
          >
            {loading ? 'Processing...' : 'Continue to Dashboard'}
            
            {!buttonEnabled && (
              <div className="absolute -right-12 flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                <span>{countdown}s</span>
              </div>
            )}
          </Button>
          
          {!buttonEnabled && (
            <p className="text-sm text-muted-foreground mt-2">
              Please watch the tutorial before continuing ({countdown} seconds remaining)
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Tutorial;
