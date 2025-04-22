
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
  
  // Track if the component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // When script option changes, fetch existing script
  useEffect(() => {
    const fetchExistingScript = async () => {
      if (!user || scriptOption !== 'ai_remake') return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('custom_script')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching custom script:', error);
          return;
        }
        
        if (data && data.custom_script) {
          setScript(data.custom_script);
          updateWordCount(data.custom_script);
        }
      } catch (error) {
        console.error('Error in fetchExistingScript:', error);
      }
    };
    
    fetchExistingScript();
  }, [user, scriptOption]);

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
    
    // Save script to finalscript in real-time as user edits
    if (user) {
      saveFinalScript(newScript);
    }
  };

  // Helper function to save script to finalscript column
  const saveFinalScript = async (scriptToSave: string) => {
    if (!user) return;
    
    try {
      console.log("Saving script to finalscript column:", scriptToSave);
      const { error } = await supabase
        .from('profiles')
        .update({
          finalscript: scriptToSave
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving finalscript:', error);
      }
    } catch (error) {
      console.error('Error saving script to finalscript:', error);
    }
  };

  const checkPreviewStatus = async () => {
    if (!user || !isMounted.current) return;
    
    console.log("Checking preview status, isLoading:", isLoading);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preview, previewscript')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      console.log("Profile preview status:", profile.preview, "previewscript length:", profile.previewscript?.length);
      
      if (profile.preview === 'generated' && profile.previewscript) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
          console.log('Polling stopped: script generated');
          
          toast({
            title: "Script Preview Ready",
            description: "Your script preview has been generated.",
          });
        }
        
        if (isMounted.current) {
          setIsLoading(false);
          setScript(profile.previewscript);
          updateWordCount(profile.previewscript);
          setHasLoadedScript(true);
          setIsPreviewVisible(true);
          
          // Save the newly generated script to finalscript
          saveFinalScript(profile.previewscript);
          
          // For ai_remake option, also save to custom_script
          if (scriptOption === 'ai_remake') {
            saveCustomScript(profile.previewscript);
          }
        }
      } else if (profile.preview === 'generating') {
        console.log('Script still generating...');
      }
    } catch (error) {
      console.error('Error checking preview status:', error);
      if (pollingInterval && isMounted.current) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
        setIsLoading(false);
        
        toast({
          title: "Error",
          description: "Failed to check preview status. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleGeneratePreview = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setIsEdited(false); // Reset edited state when generating a new preview
    setHasLoadedScript(false); // Reset loaded state
    
    try {
      // First, save current script to finalscript if there is one
      if (script) {
        await saveFinalScript(script);
      }
      
      // For ai_remake, also save to custom_script
      if (scriptOption === 'ai_remake' && script) {
        await saveCustomScript(script);
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preview: 'generating',
          // Don't clear previewscript and finalscript
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
    
    // Save current script to finalscript before regenerating
    if (script) {
      await saveFinalScript(script);
      
      // For ai_remake, also save to custom_script
      if (scriptOption === 'ai_remake') {
        await saveCustomScript(script);
      }
    }
    
    setIsLoading(true);
    setIsEdited(false);
    setHasLoadedScript(false);
    
    try {
      console.log("Starting script regeneration...");
      
      const { error } = await supabase
        .from('profiles')
        .update({
          preview: 'generating',
          // Don't clear previewscript and finalscript
        })
        .eq('id', user.id);

      if (error) throw error;

      // Use the same webhook URL with regenerate=true parameter
      const webhookResponse = await fetch(
        `https://primary-production-ce25.up.railway.app/webhook/scriptfind?userId=${user.id}&regenerate=true`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (!webhookResponse.ok) {
        throw new Error(`Webhook failed with status ${webhookResponse.status}`);
      }
      
      console.log("Regeneration webhook called successfully");

      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

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

  // Helper function to save to custom_script column
  const saveCustomScript = async (scriptToSave: string) => {
    if (!user) return;
    
    try {
      console.log("Saving to custom_script column:", scriptToSave);
      const { error } = await supabase
        .from('profiles')
        .update({
          custom_script: scriptToSave
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving custom_script:', error);
      }
    } catch (error) {
      console.error('Error saving to custom_script:', error);
    }
  };

  // Function to use and save script
  const handleUseScript = async (scriptToUse: string) => {
    if (!user) return;

    try {
      console.log("Saving finalscript:", scriptToUse);
      
      const updates: { [key: string]: string } = {
        finalscript: scriptToUse
      };
      
      // For ai_remake, also save to custom_script
      if (scriptOption === 'ai_remake') {
        updates.custom_script = scriptToUse;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Callback to parent component
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
      console.log("Saving custom script as finalscript:", scriptToSave);
      
      const updates: { [key: string]: string } = {
        finalscript: scriptToSave,
        custom_script: scriptToSave
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Database error when saving custom script:', error);
        throw error;
      }

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

  // Run initial check for preview status when component mounts
  useEffect(() => {
    if (user && isPreviewVisible && isLoading) {
      checkPreviewStatus();
    }
  }, [user, isPreviewVisible]);

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
    setIsPreviewVisible,
    handleScriptChange,
    handleGeneratePreview,
    handleRegenerateScript,
    handleUseScript,
    handleSaveCustomScript
  };
};
