
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useScriptPreview = (user: User | null, onScriptGenerated: (script: string) => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
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

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('profile-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload: any) => {
          const { preview, previewscript } = payload.new;
          
          if (preview === 'generated' && previewscript) {
            setIsLoading(false);
            setScript(previewscript);
            updateWordCount(previewscript);
            setIsPreviewVisible(true);
            
            toast({
              title: "Script Preview Ready",
              description: "Your script preview has been generated.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

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
