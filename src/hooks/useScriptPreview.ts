
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useScriptPreview = (user: User | null, onScriptGenerated: (script: string) => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
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
  };

  const checkPreviewStatus = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preview, previewscript')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile.preview === 'generated' && profile.previewscript) {
        setIsLoading(false);
        setScript(profile.previewscript);
        updateWordCount(profile.previewscript);
        
        // Show toast only once when script is first loaded
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
          
          toast({
            title: "Script Preview Ready",
            description: "Your script preview has been generated.",
          });
        }
      }
    } catch (error) {
      console.error('Error checking preview status:', error);
    }
  };

  const handleGeneratePreview = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preview: 'generating',
          previewscript: null
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const webhookResponse = await fetch(`https://primary-production-ce25.up.railway.app/webhook/scriptfind?userId=${user.id}`, {
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
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preview: 'generating',
          previewscript: null
        })
        .eq('id', user.id);

      if (error) throw error;

      // Clear any existing polling interval before setting a new one
      if (pollingInterval) {
        clearInterval(pollingInterval);
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

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return {
    isLoading,
    script,
    wordCount,
    isPreviewVisible,
    handleScriptChange,
    handleGeneratePreview,
    handleRegenerateScript
  };
};
