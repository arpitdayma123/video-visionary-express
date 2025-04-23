
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScriptHandlerProps {
  userId: string | undefined;
  scriptOption: string;
  customScript: string;
  previewScriptContent: string;
  isScriptPreviewVisible: boolean;
  hasFinalizedPreviewScript: boolean;
  setPreviewScriptContent: (content: string) => void;
  setHasFinalizedPreviewScript: (value: boolean) => void;
  setIsScriptSelected: (value: boolean) => void;
  onScriptConfirmed?: (script: string) => void;
}

const ScriptHandler: React.FC<ScriptHandlerProps> = ({
  userId,
  scriptOption,
  customScript,
  previewScriptContent,
  isScriptPreviewVisible,
  hasFinalizedPreviewScript,
  setPreviewScriptContent,
  setHasFinalizedPreviewScript,
  setIsScriptSelected,
  onScriptConfirmed
}) => {
  const { toast } = useToast();
  
  // Handle script confirmed from ScriptSelection component
  const handleScriptConfirmed = (script: string) => {
    setIsScriptSelected(true);
    if (scriptOption === 'ai_find' || scriptOption === 'ig_reel') {
      setPreviewScriptContent(script);
      setHasFinalizedPreviewScript(true); // Every click sets to true
    } else {
      if (onScriptConfirmed) {
        onScriptConfirmed(script);
      }
    }
  };

  // Handle script preview visibility changes
  const handleScriptPreviewVisible = (visible: boolean, scriptValue?: string) => {
    if (visible && typeof scriptValue === "string" && (scriptOption === 'ai_find' || scriptOption === 'ig_reel')) {
      setPreviewScriptContent(scriptValue);
    }
  };

  // Save script before video generation
  const saveScriptForGeneration = async () => {
    const scriptToSave =
      (scriptOption === "ai_find" || scriptOption === "ig_reel")
        ? previewScriptContent
        : customScript;
    
    if (!scriptToSave) {
      toast({
        title: "Script Error",
        description: "No script is available to generate the video.",
        variant: "destructive"
      });
      return false;
    }

    if (!userId) return false;

    try {
      console.log("Saving finalscript before video generation:", scriptToSave);
      const { error } = await supabase
        .from('profiles')
        .update({ finalscript: scriptToSave })
        .eq('id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving script to finalscript:', error);
      toast({
        title: "Error",
        description: "Failed to save your script before video generation.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    handleScriptConfirmed,
    handleScriptPreviewVisible,
    saveScriptForGeneration
  };
};

export default ScriptHandler;
