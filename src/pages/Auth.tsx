
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import AuthForm from '@/components/auth/AuthForm';
import { sendWelcomeEmail } from '@/utils/emailService';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Function to add user to Resend audience
  const addUserToResendAudience = async (email: string, name?: string) => {
    try {
      // Split name into first and last name if provided
      let firstName = "", lastName = "";
      if (name) {
        const nameParts = name.split(' ');
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      }

      console.log("Calling add-to-resend-audience with:", { email, first_name: firstName, last_name: lastName });

      const { data, error } = await supabase.functions.invoke("add-to-resend-audience", {
        body: { 
          email, 
          first_name: firstName, 
          last_name: lastName 
        },
      });

      if (error) {
        console.error("Error adding user to Resend audience:", error);
      } else {
        console.log("User added to Resend audience:", data);
      }
    } catch (error) {
      console.error("Error in addUserToResendAudience:", error);
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        console.log("Existing session found:", data.session.user.email);
        
        // Add existing user to Resend audience
        if (data.session.user.email) {
          try {
            console.log("Adding existing user to Resend audience:", data.session.user.email);
            await addUserToResendAudience(
              data.session.user.email, 
              data.session.user.user_metadata?.full_name
            );
          } catch (e) {
            console.error("Failed to add existing user to audience:", e);
          }
        }
        
        // Get user profile to check if they've seen the tutorial
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();
        
        // If new user or has not seen tutorial, redirect to tutorial
        if (!profileData || error) {
          console.log("No profile found or error, redirecting to tutorial");
          navigate('/tutorial');
        } else if (profileData.has_seen_tutorial !== true) {
          console.log("User has not seen tutorial, redirecting to tutorial");
          navigate('/tutorial');
        } else {
          console.log("User has seen tutorial, redirecting to dashboard");
          navigate('/dashboard');
        }
      }
    };
    
    checkSession();

    // Handle URL auth tokens for OAuth logins
    const handleOAuthRedirect = async () => {
      // Check for '#' in URL which may contain auth tokens for providers like Google
      if (window.location.hash) {
        setLoading(true);
        const { data, error: userError } = await supabase.auth.getUser();
        setLoading(false);
        
        if (data?.user && !userError) {
          console.log("OAuth user authenticated:", data.user.email);
          
          // Add OAuth user to Resend audience
          if (data.user.email) {
            try {
              console.log("Adding OAuth user to Resend audience:", data.user.email);
              await addUserToResendAudience(
                data.user.email, 
                data.user.user_metadata?.full_name
              );
            } catch (e) {
              console.error("Failed to add OAuth user to audience:", e);
            }
          }
          
          // Send welcome email for OAuth sign-ups
          try {
            await sendWelcomeEmail(data.user.email || '', data.user?.user_metadata?.full_name);
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Continue with sign-in flow even if email fails
          }
          
          // Check if user has seen tutorial
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (!profileData || error || profileData.has_seen_tutorial !== true) {
            console.log("OAuth user needs to see tutorial");
            navigate('/tutorial');
          } else {
            console.log("OAuth user has seen tutorial");
            navigate('/dashboard');
          }
          
          toast({
            title: "Authentication successful",
            description: "You've been signed in.",
          });
        }
      }
    };
    
    handleOAuthRedirect();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        if (event === 'SIGNED_IN' && session) {
          console.log("User signed in:", session.user.email);
          
          // Add user to Resend audience on sign-in
          if (session.user.email) {
            try {
              console.log("Adding signed-in user to Resend audience:", session.user.email);
              await addUserToResendAudience(
                session.user.email,
                session.user.user_metadata?.full_name
              );
            } catch (e) {
              console.error("Failed to add signed-in user to audience:", e);
            }
          }
          
          // Check if user has seen tutorial
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          console.log("Profile data for redirection check:", profileData, error);
          
          if (!profileData || error || profileData.has_seen_tutorial !== true) {
            console.log("Redirecting new user to tutorial");
            navigate('/tutorial');
          } else {
            console.log("Redirecting existing user to dashboard");
            navigate('/dashboard');
          }
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [navigate, toast]);

  return (
    <MainLayout title="Account Access" subtitle="Sign in or create an account" showNav={false}>
      <div className="max-w-md mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <AuthForm onSignUp={async (email, name) => {
            console.log("Sign-up callback triggered for:", email);
            // Add new user to Resend audience on sign up
            try {
              console.log("Adding new signup user to Resend audience:", email);
              await addUserToResendAudience(email, name);
            } catch (e) {
              console.error("Failed to add new signup user to audience:", e);
            }
            
            try {
              await sendWelcomeEmail(email, name);
            } catch (error) {
              console.error('Failed to send welcome email:', error);
              // Continue with sign-up flow even if email fails
            }
          }} />
        )}
      </div>
    </MainLayout>
  );
};

export default Auth;
