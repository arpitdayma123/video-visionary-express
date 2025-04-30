
/**
 * Fetch with timeout and retry capabilities for robust API calls
 */

interface FetchWithTimeoutOptions {
  method?: string;
  headers?: HeadersInit;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Enhanced fetch function with timeout and retry capabilities
 * @param url - The URL to fetch
 * @param options - Extended fetch options including timeout and retry settings
 * @returns Promise with the fetch response
 */
export const fetchWithTimeout = async (
  url: string, 
  options: FetchWithTimeoutOptions = {}
): Promise<Response> => {
  const {
    timeout = 300000, // 5 minutes default timeout
    retries = 3,
    retryDelay = 5000,
    method = 'GET',
    headers = {},
    body
  } = options;

  // Function to perform a single fetch attempt with timeout
  const fetchAttempt = (): Promise<Response> => {
    // Create abort controller for this attempt
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };
    
    // Add body if provided
    if (body) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    
    return fetch(url, requestOptions)
      .then(response => {
        clearTimeout(timeoutId);
        
        // Only throw for network errors, not HTTP errors (4xx, 5xx)
        // Those will be handled by the calling code
        if (!response.ok && (response.status >= 500 || response.status === 408)) {
          // Only retry on server errors (5xx) and timeout (408)
          throw new Error(`HTTP error ${response.status}`);
        }
        
        return response;
      })
      .catch(error => {
        clearTimeout(timeoutId);
        throw error;
      });
  };

  // Retry logic
  let lastError: Error;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add increasing delay between retry attempts
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        console.log(`Retry attempt ${attempt} for ${url}`);
      }
      
      return await fetchAttempt();
    } catch (error) {
      console.error(`Fetch attempt ${attempt + 1}/${retries + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't wait on the last attempt
      if (attempt === retries) {
        break;
      }
    }
  }

  // All retries failed
  throw lastError;
};
