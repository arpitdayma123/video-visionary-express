import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useScriptUtils } from './script/useScriptUtils';

export const useAiRemake = (
  user: User | null, 
  onScriptGenerated: (script: string) => void,
  onScriptLoaded?: () => void
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const { toast } = useToast();
  const { updateWordCount, saveFinalScript } = useScriptUtils();

  const handleRegenerateScript = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('custom_script')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      if (!profileData.custom_script) {
        toast({
          title: "No script to remake",
          description: "Please enter a script first before using the AI remake feature.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preview: 'generating'
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      const webhookResponse = await fetch(
        `https://primary-production-ce25.up.railway.app/webhook/scriptremake?userId=${user.id}`,
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
      
      // Start polling for the result
      const checkRemakeStatus = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('preview, remade_script')
            .eq('id', user.id)
            .single();
            
          if (error) throw error;
          
          if (data.preview === 'completed' && data.remade_script) {
            clearInterval(pollingInterval);
            setIsLoading(false);
            
            // Set the remade script and save it
            setScript(data.remade_script);
            onScriptGenerated(data.remade_script);
            saveFinalScript(user, data.remade_script);
            
            // Call onScriptLoaded if provided
            if (onScriptLoaded) {
              onScriptLoaded();
            }
            
            toast({
              title: "Script remade",
              description: "Your script has been enhanced by AI."
            });
          } else if (data.preview === 'failed') {
            clearInterval(pollingInterval);
            setIsLoading(false);
            
            toast({
              title: "Script remake failed",
              description: "There was an error remaking your script. Please try again.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error checking remake status:', error);
          clearInterval(pollingInterval);
          setIsLoading(false);
          
          toast({
            title: "Error",
            description: "Failed to check script remake status. Please try again.",
            variant: "destructive"
          });
        }
      };
      
      const pollingInterval = setInterval(checkRemakeStatus, 2000);
      
    } catch (error) {
      console.error('Error remaking script:', error);
      setIsLoading(false);
      
      toast({
        title: "Error",
        description: "Failed to remake your script. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    isLoading,
    script,
    handleRegenerateScript
  };
};
