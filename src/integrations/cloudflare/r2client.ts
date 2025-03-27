import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration
const R2_ACCESS_KEY_ID = "4b62c6d6b71a694ee506a892c58ae30b";
const R2_SECRET_ACCESS_KEY = "2a9559383968f2d250122b93ef7ab762586b8cbfa1845377e727fc31b8154472";
const R2_ENDPOINT = "https://59a6ce4614e27914884ec61b197b5415.r2.cloudflarestorage.com";
const R2_VIDEO_PUBLIC_URL = "https://pub-6e830637fe3847779d4fc5a82ea93d64.r2.dev";
const R2_VOICE_PUBLIC_URL = "https://pub-4b649cc1db3b4eaeb1bdf1062acd5b4a.r2.dev";
const VIDEO_BUCKET_NAME = "video";
const VOICE_BUCKET_NAME = "voice";

// Create an S3 client with R2 configuration
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to Cloudflare R2
 * @param file The file to upload
 * @param key The key (path) for the file in the bucket
 * @param bucket The bucket name (video or voice)
 * @param contentType The content type of the file
 * @returns The URL of the uploaded file
 */
export const uploadToR2 = async (
  file: File | Blob, 
  key: string, 
  bucket: 'video' | 'voice',
  contentType?: string
): Promise<string> => {
  const bucketName = bucket === 'video' ? VIDEO_BUCKET_NAME : VOICE_BUCKET_NAME;
  
  try {
    console.log(`Uploading file to R2: ${key} in bucket ${bucketName}`);
    
    // Use the file directly in browser environments
    // The AWS SDK will handle browser File and Blob objects correctly
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType || file.type,
    });

    // Upload the file
    await r2Client.send(putCommand);
    console.log(`Successfully uploaded to R2: ${key}`);
    
    // Return the appropriate public URL based on bucket type
    const publicUrl = bucket === 'video' 
      ? `${R2_VIDEO_PUBLIC_URL}/${key}` 
      : `${R2_VOICE_PUBLIC_URL}/${key}`;
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
};

/**
 * Delete a file from Cloudflare R2
 * @param key The key (path) of the file to delete
 * @param bucket The bucket name (video or voice)
 */
export const deleteFromR2 = async (
  key: string,
  bucket: 'video' | 'voice'
): Promise<void> => {
  const bucketName = bucket === 'video' ? VIDEO_BUCKET_NAME : VOICE_BUCKET_NAME;
  
  try {
    console.log(`Deleting file from R2: ${key} in bucket ${bucketName}`);
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    await r2Client.send(deleteCommand);
    console.log(`Successfully deleted ${key} from ${bucketName} bucket`);
  } catch (error) {
    console.error('Error deleting from R2:', error);
    throw error;
  }
};

/**
 * Extract the key from a R2 URL
 * @param url The R2 URL
 * @returns The key (path) of the file
 */
export const getKeyFromUrl = (url: string): string => {
  // Match against both video and voice public URLs
  if (url.includes(R2_VIDEO_PUBLIC_URL)) {
    return url.replace(`${R2_VIDEO_PUBLIC_URL}/`, '');
  } else if (url.includes(R2_VOICE_PUBLIC_URL)) {
    return url.replace(`${R2_VOICE_PUBLIC_URL}/`, '');
  } else if (url.includes(R2_ENDPOINT)) {
    // Handle endpoint URLs with bucket names
    const videoPattern = new RegExp(`${R2_ENDPOINT}/${VIDEO_BUCKET_NAME}/(.+)`);
    const voicePattern = new RegExp(`${R2_ENDPOINT}/${VOICE_BUCKET_NAME}/(.+)`);
    
    let match = url.match(videoPattern) || url.match(voicePattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Fallback for URLs that don't match the patterns
  console.warn('Could not extract key from URL using pattern matching:', url);
  const urlObj = new URL(url);
  // Return everything after the domain
  return urlObj.pathname.slice(1);
};

/**
 * Determine the bucket from a URL
 * @param url The R2 URL
 * @returns The bucket ('video' or 'voice')
 */
export const getBucketFromUrl = (url: string): 'video' | 'voice' | null => {
  if (url.includes(R2_VIDEO_PUBLIC_URL) || url.includes(`/${VIDEO_BUCKET_NAME}/`)) {
    return 'video';
  } else if (url.includes(R2_VOICE_PUBLIC_URL) || url.includes(`/${VOICE_BUCKET_NAME}/`)) {
    return 'voice';
  }
  return null;
};

/**
 * Check if a URL is from R2 storage
 * @param url The URL to check
 * @returns Boolean indicating if the URL is from R2
 */
export const isR2Url = (url: string): boolean => {
  return (
    url.includes(R2_ENDPOINT) || 
    url.includes(R2_VIDEO_PUBLIC_URL) || 
    url.includes(R2_VOICE_PUBLIC_URL)
  );
};

/**
 * Check if a file exists in R2
 * @param key The key (path) of the file
 * @param bucket The bucket name
 * @returns Boolean indicating if the file exists
 */
export const checkFileExistsInR2 = async (key: string, bucket: 'video' | 'voice'): Promise<boolean> => {
  const bucketName = bucket === 'video' ? VIDEO_BUCKET_NAME : VOICE_BUCKET_NAME;
  
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    await r2Client.send(command);
    return true;
  } catch (error) {
    // If the file doesn't exist, return false
    return false;
  }
};
