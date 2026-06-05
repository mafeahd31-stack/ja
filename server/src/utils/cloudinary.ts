import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Upload a file buffer or base64 string to Cloudinary
 */
export async function uploadImage(
  file: string | Buffer,
  folder: string = 'jaykom',
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number;
  }
): Promise<UploadResult> {
  const uploadOptions: Record<string, unknown> = {
    folder,
    resource_type: 'image',
    unique_filename: true,
    ...options,
  };

  const result = await cloudinary.uploader.upload(file.toString(), uploadOptions);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}

/**
 * Upload multiple files
 */
export async function uploadImages(
  files: (string | Buffer)[],
  folder: string = 'jaykom'
): Promise<UploadResult[]> {
  return Promise.all(files.map((file) => uploadImage(file, folder)));
}

/**
 * Upload a video file to Cloudinary
 */
export async function uploadVideo(
  file: string | Buffer,
  folder: string = 'jaykom/chat'
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(file.toString(), {
    folder,
    resource_type: 'video',
    unique_filename: true,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}

/**
 * Upload an audio file to Cloudinary
 */
export async function uploadAudio(
  file: string | Buffer,
  folder: string = 'jaykom/chat'
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(file.toString(), {
    folder,
    resource_type: 'video', // Cloudinary handles audio as video
    unique_filename: true,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}

/**
 * Delete a file from Cloudinary by public ID
 */
export async function deleteFile(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get folder usage stats
 */
export async function getFolderUsage(folder: string = 'jaykom') {
  const result = await cloudinary.api.resources_by_asset_folder(folder, {
    max_results: 1,
  });
  return result;
}

export default cloudinary;
