
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

export const useScriptUtils = () => {
  const { toast } = useToast();
  
  const updateWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const saveFinalScript = async (user: User | null, scriptToSave: string) => {
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
        throw error;
      }
    } catch (error) {
      console.error('Error saving script to finalscript:', error);
      throw error;
    }
  };

  const saveCustomScript = async (user: User | null, scriptToSave: string) => {
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
        throw error;
      }
    } catch (error) {
      console.error('Error saving to custom_script:', error);
      throw error;
    }
  };

  return {
    updateWordCount,
    saveFinalScript,
    saveCustomScript
  };
};
