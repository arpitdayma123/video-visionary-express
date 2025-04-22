import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useScriptUtils } from './script/useScriptUtils';
import { useScriptPolling } from './script/useScriptPolling';
import { useAiRemake } from './script/useAiRemake';

export const useScriptPreview = (
  user: User | null, 
  onScriptGenerated: (script: string) => void,
  scriptOption: string
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const { toast } = useToast();
  const { updateWordCount, saveFinalScript } = useScriptUtils();
  const { checkPreviewStatus, pollingInterval } = useScriptPolling(
    user,
    isLoading,
    handleScriptGenerated,
    scriptOption,
    setIsLoading
  );

  // Use AI Remake hook if that option is selected
  const aiRemake = useAiRemake(user, onScriptGenerated);
  if (scriptOption === 'ai_remake') {
    return {
      ...aiRemake,
      isPreviewVisible,
      setIsPreviewVisible,
      handleGeneratePreview: aiRemake.handleRegenerateScript
    };
  }

  function handleScriptGenerated(newScript: string) {
    setScript(newScript);
    setWordCount(updateWordCount(newScript));
    saveFinalScript(user, newScript);
    onScriptGenerated(newScript);
  }

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newScript = e.target.value;
    setScript(newScript);
    setWordCount(updateWordCount(newScript));
    
    if (user) {
      saveFinalScript(user, newScript);
    }
  };

  // Main preview generation: regenerate is always false here
  const handleGeneratePreview = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      const webhookResponse = await fetch(
        `https://primary-production-ce25.up.railway.app/webhook/scriptfind?userId=${user.id}&regenerate=false`,
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

      setIsPreviewVisible(true);

      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
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

  // Regenerate is ALWAYS true here now
  const handleRegenerateScript = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

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

      setIsPreviewVisible(true);

      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
    } catch (error) {
      console.error('Error starting regeneration:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to regenerate script. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Change Script handler -- sends changescript=true
  const handleChangeScript = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preview: 'generating' })
        .eq('id', user.id);

      if (error) throw error;

      const webhookResponse = await fetch(
        `https://primary-production-ce25.up.railway.app/webhook/scriptfind?userId=${user.id}&changescript=true`,
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

      setIsPreviewVisible(true);

      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      const interval = setInterval(checkPreviewStatus, 2000);
      pollingInterval.current = interval;
    } catch (error) {
      console.error('Error starting change script generation:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to request a new script. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    isLoading,
    script,
    wordCount,
    isPreviewVisible,
    setIsPreviewVisible,
    handleScriptChange,
    handleGeneratePreview,
    handleRegenerateScript,
    handleChangeScript, // expose new handler
  };
};
