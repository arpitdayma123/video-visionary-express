
/**
 * BunnyCDN integration for file storage
 */

// BunnyCDN Configuration
const BUNNY_STORAGE_ZONE = "zockto";
const BUNNY_API_KEY = "17e23633-2a7a-4d29-9450be4d6c8e-e01f-45f4";
const BUNNY_STORAGE_URL = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}`;
const BUNNY_CDN_URL = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net`;

/**
 * Uploads a file to BunnyCDN storage
 * @param file - The file to upload
 * @param path - The path where the file should be stored (including filename)
 * @returns Promise with the CDN URL of the uploaded file
 */
export const uploadToBunny = async (file: File, path: string): Promise<string> => {
  console.log(`Uploading to BunnyCDN: ${path}`);
  
  try {
    const response = await fetch(`${BUNNY_STORAGE_URL}/${path}`, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: file
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('BunnyCDN upload error:', errorText);
      throw new Error(`BunnyCDN upload failed: ${response.status} ${response.statusText}`);
    }
    
    // Return the CDN URL for the uploaded file
    const cdnUrl = `${BUNNY_CDN_URL}/${path}`;
    console.log(`Successfully uploaded to BunnyCDN: ${cdnUrl}`);
    return cdnUrl;
  } catch (error) {
    console.error('Error uploading to BunnyCDN:', error);
    throw error;
  }
};

/**
 * Deletes a file from BunnyCDN storage
 * @param path - The path of the file to delete
 * @returns Promise that resolves when the file is deleted
 */
export const deleteFromBunny = async (path: string): Promise<void> => {
  console.log(`Deleting from BunnyCDN: ${path}`);
  
  try {
    const response = await fetch(`${BUNNY_STORAGE_URL}/${path}`, {
      method: 'DELETE',
      headers: {
        'AccessKey': BUNNY_API_KEY,
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('BunnyCDN delete error:', errorText);
      throw new Error(`BunnyCDN delete failed: ${response.status} ${response.statusText}`);
    }
    
    console.log(`Successfully deleted from BunnyCDN: ${path}`);
  } catch (error) {
    console.error('Error deleting from BunnyCDN:', error);
    throw error;
  }
};

/**
 * Extracts the file path from a BunnyCDN URL
 * @param url - The BunnyCDN URL
 * @returns The file path within the storage zone
 */
export const getPathFromBunnyUrl = (url: string): string | null => {
  try {
    // Check if it's a Bunny CDN URL
    if (url.includes(BUNNY_CDN_URL)) {
      return url.replace(`${BUNNY_CDN_URL}/`, '');
    }
    return null;
  } catch (error) {
    console.error('Error extracting path from BunnyCDN URL:', error);
    return null;
  }
};
