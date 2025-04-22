
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useScriptPreview } from '@/hooks/useScriptPreview';
import GeneratePreviewButton from './script/GeneratePreviewButton';
import ScriptPreviewContent from './script/ScriptPreviewContent';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ScriptPreviewProps {
  scriptOption: string;
  onUseScript: (script: string) => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onUseScript
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [waitTimeExpired, setWaitTimeExpired] = useState(false);
  const [initialScript, setInitialScript] = useState('');
  
  const {
    isLoading,
    script,
    wordCount,
    isPreviewVisible,
    setIsPreviewVisible,
    handleScriptChange,
    handleGeneratePreview,
    handleRegenerateScript
  } = useScriptPreview(user, onUseScript, scriptOption);

  // Reset preview visibility when script option changes
  useEffect(() => {
    setIsPreviewVisible(false);
  }, [scriptOption, setIsPreviewVisible]);

  // Handle regenerate with the same pattern as generate preview
  const handleRegenerate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGenerationStartTime(Date.now());
    setWaitTimeExpired(false);
    handleRegenerateScript();
  };

  // Wrapper to track generation start time and save script if needed
  const handleStartGeneration = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // First save the script to custom_script if in ai_remake mode
      if (scriptOption === 'ai_remake' && user) {
        // Fetch the current script from the hook
        const { data, error } = await supabase
          .from('profiles')
          .select('custom_script')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching script before generation:', error);
          toast({
            title: "Error",
            description: "Failed to load your script. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        // Use the fetched script for generation
        console.log('Current script before generation:', data.custom_script);
      }
      
      // Continue with normal generation flow
      setGenerationStartTime(Date.now());
      setWaitTimeExpired(false);
      handleGeneratePreview();
    } catch (error) {
      console.error('Error in handleStartGeneration:', error);
      toast({
        title: "Error",
        description: "Failed to start generating preview. Please try again.",
        variant: "destructive"
      });
    }
  };

  // New handler for initial script input for ai_remake
  const handleInitialScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInitialScript(e.target.value);
  };

  // Prevent event bubbling
  const preventPropagation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // For ai_remake, show initial script input if preview is not visible
  if (!isPreviewVisible && scriptOption === 'ai_remake') {
    return (
      <div onClick={preventPropagation} className="mt-6 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="initial-script" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
              Enter Your Script
            </label>
            <span className="text-xs text-muted-foreground">
              {initialScript.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
          <Textarea
            id="initial-script"
            value={initialScript}
            onChange={handleInitialScriptChange}
            placeholder="Enter your script here to let our AI remake it..."
            className="h-48 resize-none"
          />
        </div>
        <GeneratePreviewButton
          isLoading={isLoading}
          onGenerate={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
              // Save initial script to custom_script
              if (user && initialScript.trim()) {
                const { error } = await supabase
                  .from('profiles')
                  .update({ custom_script: initialScript })
                  .eq('id', user.id);
                
                if (error) throw error;
              }
              
              // Continue with normal generation
              handleStartGeneration(e);
            } catch (error) {
              console.error('Error saving initial script:', error);
              toast({
                title: "Error",
                description: "Failed to save your script. Please try again.",
                variant: "destructive"
              });
            }
          }}
          scriptOption={scriptOption}
          generationStartTime={generationStartTime}
          waitTimeExpired={waitTimeExpired}
        />
      </div>
    );
  }

  return (
    <div onClick={preventPropagation}>
      <ScriptPreviewContent
        isLoading={isLoading}
        script={script}
        wordCount={wordCount}
        onScriptChange={handleScriptChange}
        onRegenerateScript={handleRegenerate}
      />
    </div>
  );
};

export default ScriptPreview;
