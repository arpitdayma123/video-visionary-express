
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useScriptPreview = (
  user: User | null, 
  onScriptGenerated: (script: string) => void,
  scriptOption: string
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasLoadedScript, setHasLoadedScript] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const { toast } = useToast();

  // Calculate word count whenever script changes
  const updateWordCount = (text: string) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  };

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newScript = e.target.value;
    setScript(newScript);
    updateWordCount(newScript);
    setIsEdited(true); // Mark as edited when user changes the script
  };

  const checkPreviewStatus = async () => {
    // Don't check if the user is missing, if we've already loaded a script, or if user has edited
    if (!user || hasLoadedScript || isEdited) {
      if (pollingInterval) {
        // Always clear polling if script is loaded or edited
        clearInterval(pollingInterval);
        setPollingInterval(null);
        console.log('Polling stopped: script loaded or edited');
      }
      return;
    }
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preview, previewscript')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // If preview is generated, stop polling and update the script
      if (profile.preview === 'generated' && profile.previewscript) {
        // Stop polling immediately
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
          console.log('Polling stopped: script generated');
          
          // Show toast notification only once when polling stops
          toast({
            title: "Script Preview Ready",
            description: "Your script preview has been generated.",
          });
        }
        
        setIsLoading(false);
        setScript(profile.previewscript);
        updateWordCount(profile.previewscript);
        setHasLoadedScript(true); // Mark as loaded
        setIsPreviewVisible(true); // Make sure preview is visible when script is ready
      }
    } catch (error) {
      console.error('Error checking preview status:', error);
      // If there's an error, stop polling to prevent continuous errors
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  };

  const handleGeneratePreview = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setIsEdited(false); // Reset edited state when generating a new preview
    setHasLoadedScript(false); // Reset loaded state
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preview: 'generating',
          previewscript: null,
          finalscript: null // Reset finalscript when generating new preview
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const webhookResponse = await fetch(`https://primary-production-ce25.up.railway.app/webhook/scriptfind?userId=${user.id}&regenerate=false`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook failed with status ${webhookResponse.status}`);
      }
      
      setIsPreviewVisible(true);

      // Clear any existing polling interval before setting a new one
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      // Start polling every 2 seconds
      const interval = setInterval(checkPreviewStatus, 2000);
      setPollingInterval(interval);

    } catch (error) {
      console.error('Error starting preview generation:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to start preview generation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRegenerateScript = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setIsEdited(false); // Reset edited state when regenerating
    setHasLoadedScript(false); // Reset loaded state
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preview: 'generating',
          previewscript: null,
          finalscript: null // Reset finalscript when regenerating
        })
        .eq('id', user.id);

      if (error) throw error;

      // Use the same webhook URL, but add regenerate=true parameter
      const webhookResponse = await fetch(`https://primary-production-ce25.up.railway.app/webhook/scriptfind?userId=${user.id}&regenerate=true`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook failed with status ${webhookResponse.status}`);
      }

      // Clear any existing polling interval before setting a new one
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      // Start polling when regenerating
      const interval = setInterval(checkPreviewStatus, 2000);
      setPollingInterval(interval);

    } catch (error) {
      console.error('Error regenerating script:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to regenerate script. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add function to save final script
  const handleUseScript = async (scriptToUse: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          finalscript: scriptToUse
        })
        .eq('id', user.id);

      if (error) throw error;

      onScriptGenerated(scriptToUse);
      
      toast({
        title: "Success",
        description: "Script has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving final script:', error);
      toast({
        title: "Error",
        description: "Failed to save the script. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add new function to handle saving custom scripts
  const handleSaveCustomScript = async (scriptToSave: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          finalscript: scriptToSave
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your script has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving custom script:', error);
      toast({
        title: "Error",
        description: "Failed to save the script. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add useEffect to stop polling when component unmounts or when script is loaded/edited
  useEffect(() => {
    // Check if we should stop polling because script is loaded or edited
    if (hasLoadedScript || isEdited) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
        console.log('Polling stopped due to script loaded or edited state change');
      }
    }
    
    // Cleanup polling interval on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval, hasLoadedScript, isEdited]);

  return {
    isLoading,
    script,
    wordCount,
    isPreviewVisible,
    handleScriptChange,
    handleGeneratePreview,
    handleRegenerateScript,
    handleUseScript,
    handleSaveCustomScript
  };
};
