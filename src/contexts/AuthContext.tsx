
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to update user's email in profile
  const updateUserEmail = async (userId: string, email: string) => {
    if (!userId || !email) return;
    
    try {
      console.log(`Updating email for user ${userId} to ${email}`);
      const { error } = await supabase
        .from('profiles')
        .update({ email })
        .eq('id', userId);
      
      if (error) {
        console.error('Error updating user email in profile:', error);
      } else {
        console.log('Successfully updated user email in profile');
      }
    } catch (err) {
      console.error('Unexpected error updating user email:', err);
    }
  };

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        // Update email in profile if user exists
        if (data.session?.user) {
          const { id, email } = data.session.user;
          if (email) {
            await updateUserEmail(id, email);
          }
        }
      } catch (err) {
        console.error('Unexpected error during auth initialization:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`Auth state changed: ${event}`);
        setSession(newSession);
        setUser(newSession?.user || null);
        
        // Update email in profile when user signs in or updates email
        if (newSession?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          const { id, email } = newSession.user;
          if (email) {
            await updateUserEmail(id, email);
          }
        }
        
        setLoading(false);
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
