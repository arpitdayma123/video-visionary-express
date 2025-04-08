
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [profileChecked, setProfileChecked] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    // First check if the user is logged in
    if (!loading && !session) {
      console.log("No session found, redirecting to auth");
      navigate('/auth');
      return;
    }

    // Then check if they've seen the tutorial
    if (session?.user && !checkingProfile && !profileChecked) {
      setCheckingProfile(true);
      
      const checkTutorialStatus = async () => {
        try {
          console.log("Checking tutorial status for user:", session.user.id);
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('has_seen_tutorial')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error checking tutorial status:', error);
            navigate('/tutorial');
            setCheckingProfile(false);
            return;
          }

          if (!profileData || profileData.has_seen_tutorial !== true) {
            console.log('User has not completed tutorial, redirecting');
            navigate('/tutorial');
          } else {
            console.log('User has completed tutorial, allowing access');
          }
          
          setProfileChecked(true);
          setCheckingProfile(false);
        } catch (error) {
          console.error('Error in checkTutorialStatus:', error);
          setCheckingProfile(false);
          navigate('/tutorial');
        }
      };

      checkTutorialStatus();
    }
  }, [session, loading, navigate, profileChecked, checkingProfile]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading || (session && !profileChecked && checkingProfile)) {
        console.log("Profile check taking too long, continuing anyway");
        setProfileChecked(true);
        setCheckingProfile(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeoutId);
  }, [loading, session, profileChecked, checkingProfile]);

  if (loading || (session && !profileChecked && checkingProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return session ? <>{children}</> : null;
};

export default ProtectedRoute;
