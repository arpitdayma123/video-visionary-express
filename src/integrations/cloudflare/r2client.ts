
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration
const R2_ACCESS_KEY_ID = "4b62c6d6b71a694ee506a892c58ae30b";
const R2_SECRET_ACCESS_KEY = "2a9559383968f2d250122b93ef7ab762586b8cbfa1845377e727fc31b8154472";
const R2_ENDPOINT = "https://59a6ce4614e27914884ec61b197b5415.r2.cloudflarestorage.com";
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
    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set up the PutObjectCommand
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType || file.type,
    });

    // Upload the file
    await r2Client.send(putCommand);
    
    // Return the public URL
    return `${R2_ENDPOINT}/${bucketName}/${key}`;
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
  const videoPattern = new RegExp(`${R2_ENDPOINT}/${VIDEO_BUCKET_NAME}/(.+)`);
  const voicePattern = new RegExp(`${R2_ENDPOINT}/${VOICE_BUCKET_NAME}/(.+)`);
  
  let match = url.match(videoPattern) || url.match(voicePattern);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Fallback for URLs that don't match the pattern
  console.warn('Could not extract key from URL:', url);
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  // Remove the first empty string and the bucket name
  return pathParts.slice(2).join('/');
};

/**
 * Determine the bucket from a URL
 * @param url The R2 URL
 * @returns The bucket ('video' or 'voice')
 */
export const getBucketFromUrl = (url: string): 'video' | 'voice' | null => {
  if (url.includes(`/${VIDEO_BUCKET_NAME}/`)) {
    return 'video';
  } else if (url.includes(`/${VOICE_BUCKET_NAME}/`)) {
    return 'voice';
  }
  return null;
};
