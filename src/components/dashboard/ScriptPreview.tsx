
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

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

  useEffect(() => {
    if (!user) return;

    // Subscribe to realtime updates for the user's profile
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

  const handleGeneratePreview = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // First update the profile status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preview: 'generating',
          previewscript: null
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Make the webhook call with userId parameter
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

  if (!isPreviewVisible) {
    return (
      <div className="mt-6">
        <Button
          onClick={handleGeneratePreview}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Generating Preview...
            </>
          ) : (
            'Generate Script Preview'
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="mt-6 p-6 animate-fade-in">
      <h3 className="text-lg font-medium mb-4">Script Preview</h3>
      
      <div className="space-y-4">
        <div className="relative">
          {isLoading ? (
            <div className="min-h-[200px] flex items-center justify-center bg-muted rounded-md">
              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Textarea
              value={script}
              onChange={handleScriptChange}
              placeholder="Your script will appear here..."
              className="min-h-[200px] resize-y font-mono text-sm"
            />
          )}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {wordCount} words
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => onUseScript(script)}
            disabled={!script.trim() || isLoading}
          >
            Use This Script
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRegenerateScript}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              'Regenerate Script'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ScriptPreview;
