import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { UploadedFile } from '@/hooks/useDashboardData';

interface FormSubmissionHandlerProps {
  userId: string | undefined;
  videos: UploadedFile[];
  voiceFiles: UploadedFile[];
  selectedVideo: UploadedFile | null;
  selectedVoice: UploadedFile | null;
  selectedNiches: string[];
  competitors: string[];
  scriptOption: string;
  customScript: string;
  reelUrl: string;
  previewScriptContent: string;
  hasFinalizedPreviewScript: boolean;
  isScriptPreviewVisible: boolean;
  userCredits: number;
  userStatus: string;
  setUserStatus: (status: string) => void;
  updateProfile: (updates: any) => Promise<void>;
  saveScriptForGeneration: () => Promise<boolean>;
}

const FormSubmissionHandler = ({
  userId,
  videos,
  voiceFiles,
  selectedVideo,
  selectedVoice,
  selectedNiches,
  competitors,
  scriptOption,
  customScript,
  reelUrl,
  previewScriptContent,
  hasFinalizedPreviewScript,
  isScriptPreviewVisible,
  userCredits,
  userStatus,
  setUserStatus,
  updateProfile,
  saveScriptForGeneration
}: FormSubmissionHandlerProps) => {
  const { toast } = useToast();

  // Retry helper: tries fetch up to maxRetries (default 2, so 3 total attempts)
  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries: number = 2, delay: number = 2000): Promise<Response> => {
    let attempt = 0;
    let lastError: any = null;
    while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        const resp = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);

        if (resp.ok) return resp;
        lastError = new Error(`Non-OK status: ${resp.status}`);
      } catch (err) {
        lastError = err;
      }
      attempt++;
      if (attempt <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  };

  // Main form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    // Check if this is a direct form submission or a button that's not Generate Video
    const targetElement = e.target as HTMLElement;
    if (targetElement.tagName === 'BUTTON' && 
        !targetElement.textContent?.includes('Generate Video')) {
      e.preventDefault();
      e.stopPropagation();
      return; // Don't handle the event for other buttons
    }
    
    e.preventDefault();

    // For all scriptOptions, fetch script for webhook from "previewScriptContent" (ai_find, ig_reel) or "customScript"
    const scriptForWebhook =
      (scriptOption === "ai_find" || scriptOption === "ig_reel")
        ? previewScriptContent
        : customScript;

    // Key validation check - this is where the issue likely is
    // The original logic might have had issues that prevented the form from validating properly
    if (
      videos.length === 0 ||
      voiceFiles.length === 0 ||
      selectedNiches.length === 0 ||
      competitors.length === 0 ||
      selectedVideo === null ||
      selectedVoice === null
    ) {
      toast({
        title: "Incomplete form",
        description: "Please fill in all required fields and select a target video and voice file before submitting.",
        variant: "destructive"
      });
      return;
    }

    // Check if script has been selected and preview is visible for ai_find/ig_reel
    const scriptReady = (scriptOption === 'ai_find' || scriptOption === 'ig_reel') 
      ? (hasFinalizedPreviewScript)
      : !!customScript;
      
    if (!scriptReady) {
      toast({
        title: "Script not ready",
        description: "Please generate and confirm a script before proceeding.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user has at least 1 credit
    if (userCredits < 1) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 1 credit to generate a video. Please purchase credits to continue.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user already has a video in processing
    if (userStatus === 'Processing') {
      toast({
        title: "Processing in Progress",
        description: "We are processing your previous video request. Please wait until it's completed before generating a new one.",
        variant: "destructive"
      });
      return;
    }
    
    // Special validation for Instagram reel option
    if (scriptOption === 'ig_reel' && !reelUrl) {
      toast({
        title: "Missing Instagram Reel URL",
        description: "Please provide an Instagram reel URL to proceed.",
        variant: "destructive"
      });
      return;
    }
    
    // Save the script to finalscript right before sending webhook
    const savedOk = await saveScriptForGeneration();
    if (!savedOk) return;
    
    try {
      if (!userId) throw new Error('User not authenticated');

      await updateProfile({ status: 'Processing' });
      setUserStatus('Processing');
      
      const params = new URLSearchParams({
        userId: userId,
        scriptOption: scriptOption,
        customScript: scriptForWebhook, // Always send current script content
        reelUrl: scriptOption === 'ig_reel' ? reelUrl : ''
      });

      const webhookUrl = `https://primary-production-ce25.up.railway.app/webhook/trendy?${params.toString()}`;
      console.log(`Sending webhook request to: ${webhookUrl} (will retry if fails)`);

      // Use fetch with retry
      const response = await fetchWithRetry(
        webhookUrl,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'omit',
          mode: 'cors'
        },
        2  // number of retries
      );
      
      // Check for error JSON response even if HTTP is 200
      let responseData: any = null;
      try {
        responseData = await response.clone().json();
      } catch {
        // it's ok if JSON parsing fails (may not produce error field)
      }

      if (responseData && responseData.error) {
        // Webhook responded with error payload!
        throw new Error(responseData.error);
      }

      console.log('Webhook response:', responseData);

      toast({
        title: "Request sent successfully",
        description: "Your personalized video is being processed. Please check the Results page after 5 minutes to see your video."
      });
      
    } catch (error) {
      console.error('Error processing video:', error);
      
      let errorMessage = "There was an error processing your request.";
      if (error instanceof DOMException && error.name === 'AbortError') {
        errorMessage = "Request timed out. Please try again later.";
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }

      // Revert status back to Completed if there was an error
      await updateProfile({ status: 'Completed' });
      setUserStatus('Completed');

      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return handleSubmit;
};

export default FormSubmissionHandler;
