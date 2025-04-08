
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

  useEffect(() => {
    // First check if the user is logged in
    if (!loading && !session) {
      navigate('/auth');
      return;
    }

    // Then check if they've seen the tutorial
    if (session?.user) {
      const checkTutorialStatus = async () => {
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('has_seen_tutorial')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error checking tutorial status:', error);
            navigate('/tutorial');
            return;
          }

          if (!profileData || profileData.has_seen_tutorial !== true) {
            console.log('User has not completed tutorial, redirecting');
            navigate('/tutorial');
            return;
          }

          setProfileChecked(true);
        } catch (error) {
          console.error('Error in checkTutorialStatus:', error);
          navigate('/tutorial');
        }
      };

      checkTutorialStatus();
    }
  }, [session, loading, navigate]);

  if (loading || (session && !profileChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return session ? <>{children}</> : null;
};

export default ProtectedRoute;
