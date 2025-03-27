
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// R2 Configuration
const R2_ACCESS_KEY_ID = "4b62c6d6b71a694ee506a892c58ae30b";
const R2_SECRET_ACCESS_KEY = "2a9559383968f2d250122b93ef7ab762586b8cbfa1845377e727fc31b8154472";
const R2_ENDPOINT_URL = "https://59a6ce4614e27914884ec61b197b5415.r2.cloudflarestorage.com";

// Bucket Configuration
export const BUCKET_CONFIG = {
  VIDEO: {
    NAME: "video", // Updated from "videos" to "video" to match your actual bucket name
    PUBLIC_URL: "https://pub-6e830637fe3847779d4fc5a82ea93d64.r2.dev"
  },
  VOICE: {
    NAME: "voices",
    PUBLIC_URL: "https://pub-4b649cc1db3b4eaeb1bdf1062acd5b4a.r2.dev"
  }
};

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to Cloudflare R2
 * 
 * @param file - The file to upload
 * @param bucketName - The bucket name (video or voices)
 * @param filePath - The path to store the file at
 * @returns The public URL of the uploaded file
 */
export const uploadToR2 = async (
  file: File,
  bucketName: string,
  filePath: string
): Promise<string> => {
  try {
    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      Body: file,
      ContentType: file.type,
    });

    await s3Client.send(uploadCommand);

    // Return the public URL
    const baseUrl = bucketName === BUCKET_CONFIG.VIDEO.NAME
      ? BUCKET_CONFIG.VIDEO.PUBLIC_URL
      : BUCKET_CONFIG.VOICE.PUBLIC_URL;

    return `${baseUrl}/${filePath}`;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error(`Failed to upload file to R2: ${error.message}`);
  }
};

/**
 * Delete a file from R2
 * 
 * @param bucketName - The bucket name (videos or voices)
 * @param filePath - The path of the file to delete
 */
export const deleteFromR2 = async (
  bucketName: string,
  filePath: string
): Promise<void> => {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: filePath,
    });

    await s3Client.send(deleteCommand);
    console.log(`Successfully deleted file from R2: ${filePath}`);
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error(`Failed to delete file from R2: ${error.message}`);
  }
};

/**
 * Extract the file path from a public R2 URL
 * 
 * @param url - The public R2 URL
 * @returns The extracted file path
 */
export const extractFilePathFromR2Url = (url: string): { bucketName: string, filePath: string } => {
  try {
    // Check which bucket the URL belongs to
    let bucketName: string;
    let publicBaseUrl: string;
    
    if (url.includes(BUCKET_CONFIG.VIDEO.PUBLIC_URL)) {
      bucketName = BUCKET_CONFIG.VIDEO.NAME;
      publicBaseUrl = BUCKET_CONFIG.VIDEO.PUBLIC_URL;
    } else if (url.includes(BUCKET_CONFIG.VOICE.PUBLIC_URL)) {
      bucketName = BUCKET_CONFIG.VOICE.NAME;
      publicBaseUrl = BUCKET_CONFIG.VOICE.PUBLIC_URL;
    } else {
      throw new Error('URL does not match any known bucket');
    }
    
    // Extract the file path by removing the base URL
    // Make sure to handle the leading slash
    const filePath = url.replace(`${publicBaseUrl}/`, '');
    
    return { bucketName, filePath };
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    throw new Error(`Could not extract file path from URL: ${error.message}`);
  }
};
