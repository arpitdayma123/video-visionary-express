
import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseScriptWebhookProps {
  FETCH_TIMEOUT?: number;
  MAX_RETRIES?: number;
}

export const useScriptWebhook = ({
  FETCH_TIMEOUT = 20000,
  MAX_RETRIES = 2
}: UseScriptWebhookProps = {}) => {
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Helper function to call webhook with retry logic
  const callWebhook = useCallback(async (url: string) => {
    console.log(`Calling webhook: ${url}, retry attempt: ${retryCountRef.current}`);
    
    // Create new AbortController for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Set a timeout to abort the fetch if it takes too long
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current === abortController) {
        console.log('Fetch timeout reached, aborting request');
        abortController.abort();
      }
    }, FETCH_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Origin': window.location.origin
        },
        signal: abortController.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Webhook response not OK: ${response.status}`, errorText);
        throw new Error(`Webhook failed with status ${response.status}: ${errorText}`);
      }
      
      // Parse the response
      let responseJson: any = null;
      try {
        responseJson = await response.json();
        console.log('Webhook response:', responseJson);
        
        if (responseJson?.error) {
          throw new Error(responseJson.error);
        }
      } catch (error) {
        console.error('Failed to parse webhook response:', error);
        if (error instanceof Error && error.message.includes('Unexpected')) {
          // This is likely a parsing error, not a response error
          console.log('Response parsing failed, but continuing with polling');
        } else {
          // This is a response error
          throw error;
        }
      }
      
      return { success: true, data: responseJson };
    } catch (error) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      console.error('Webhook call failed:', error);
      
      // Retry if we haven't exceeded max retries
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        console.log(`Retrying webhook call, attempt ${retryCountRef.current} of ${MAX_RETRIES}`);
        return await callWebhook(url);
      }
      
      throw error;
    }
  }, [FETCH_TIMEOUT, MAX_RETRIES]);

  const resetWebhookState = useCallback(() => {
    setWebhookError(null);
    retryCountRef.current = 0;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const cleanupWebhookResources = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    webhookError,
    setWebhookError,
    callWebhook,
    resetWebhookState,
    cleanupWebhookResources,
    retryCountRef,
  };
};
