
/**
 * Bunny Storage client for uploading and managing files
 */

// Bunny Storage configuration
const BUNNY_STORAGE_ZONE = "zockto";
const BUNNY_API_KEY = "17e23633-2a7a-4d29-9450be4d6c8e-e01f-45f4";
const BUNNY_STORAGE_URL = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}`;
const BUNNY_CDN_URL = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net`;

/**
 * Uploads a file to Bunny Storage
 * @param file File to upload
 * @param path Path within the storage (e.g., "videos/my-video.mp4")
 * @returns Promise with the CDN URL of the uploaded file
 */
export const uploadToBunny = async (file: File, path: string): Promise<string> => {
  try {
    const fileBuffer = await file.arrayBuffer();
    
    // Make API request to upload the file
    const response = await fetch(`${BUNNY_STORAGE_URL}/${path}`, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bunny Storage upload error:', errorText);
      throw new Error(`Failed to upload to Bunny Storage: ${response.status} ${response.statusText}`);
    }

    // Return the CDN URL
    return `${BUNNY_CDN_URL}/${path}`;
  } catch (error) {
    console.error('Error uploading to Bunny Storage:', error);
    throw error;
  }
};

/**
 * Deletes a file from Bunny Storage
 * @param path Path of the file to delete
 * @returns Promise with success status
 */
export const deleteFromBunny = async (path: string): Promise<boolean> => {
  try {
    // Extract path from CDN URL if full URL is provided
    if (path.startsWith(BUNNY_CDN_URL)) {
      path = path.substring(BUNNY_CDN_URL.length + 1); // +1 for the slash
    }

    const response = await fetch(`${BUNNY_STORAGE_URL}/${path}`, {
      method: 'DELETE',
      headers: {
        'AccessKey': BUNNY_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bunny Storage delete error:', errorText);
      throw new Error(`Failed to delete from Bunny Storage: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting from Bunny Storage:', error);
    throw error;
  }
};

/**
 * Extracts the file path from a Bunny CDN URL
 * @param cdnUrl The full CDN URL
 * @returns The file path component
 */
export const getPathFromBunnyUrl = (cdnUrl: string): string => {
  if (cdnUrl.startsWith(BUNNY_CDN_URL)) {
    return cdnUrl.substring(BUNNY_CDN_URL.length + 1); // +1 for the slash
  }
  return cdnUrl;
};
