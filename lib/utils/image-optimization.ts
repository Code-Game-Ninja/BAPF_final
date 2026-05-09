/**
 * Image Optimization Utilities
 * Tools for optimizing images for web delivery
 */

import imageCompression from 'browser-image-compression';

// ============================================================================
// IMAGE COMPRESSION
// ============================================================================

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
  fileType?: string;
}

/**
 * Compress image file for upload
 * Reduces file size while maintaining quality
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 1, // Max 1MB
    maxWidthOrHeight: 1920, // Max 1920px
    useWebWorker: true,
    quality: 0.8, // 80% quality
    fileType: 'image/jpeg',
    ...options,
  };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    console.log('[Image Optimization] Compressed:', {
      original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      compressed: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
      reduction: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`,
    });
    return compressedFile;
  } catch (error) {
    console.error('[Image Optimization] Compression failed:', error);
    return file; // Return original if compression fails
  }
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}

// ============================================================================
// IMAGE VALIDATION
// ============================================================================

export interface ImageValidationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  allowedTypes?: string[];
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
  size?: number;
}

/**
 * Validate image file before upload
 */
export async function validateImage(
  file: File,
  options: ImageValidationOptions = {}
): Promise<ImageValidationResult> {
  const {
    maxSizeMB = 10,
    maxWidthOrHeight = 4096,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  } = options;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  const sizeMB = file.size / 1024 / 1024;
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `File too large. Maximum: ${maxSizeMB}MB, got: ${sizeMB.toFixed(2)}MB`,
    };
  }

  // Check image dimensions
  try {
    const dimensions = await getImageDimensions(file);
    
    if (
      dimensions.width > maxWidthOrHeight ||
      dimensions.height > maxWidthOrHeight
    ) {
      return {
        valid: false,
        error: `Image too large. Maximum: ${maxWidthOrHeight}px, got: ${dimensions.width}x${dimensions.height}`,
        ...dimensions,
      };
    }

    return {
      valid: true,
      ...dimensions,
      size: file.size,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: `Failed to read image: ${error.message}`,
    };
  }
}

/**
 * Get image dimensions
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ============================================================================
// IMAGE CONVERSION
// ============================================================================

/**
 * Convert image to WebP format (better compression)
 */
export async function convertToWebP(
  file: File,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image'));
            return;
          }

          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.webp'),
            { type: 'image/webp' }
          );

          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ============================================================================
// IMAGE RESIZING
// ============================================================================

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: string;
}

/**
 * Resize image to fit within max dimensions
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    outputType = file.type,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to resize image'));
            return;
          }

          const resizedFile = new File([blob], file.name, {
            type: outputType,
          });

          resolve(resizedFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ============================================================================
// THUMBNAIL GENERATION
// ============================================================================

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(
  file: File,
  size: number = 200
): Promise<File> {
  return resizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    outputType: 'image/jpeg',
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  compressImage,
  compressImages,
  validateImage,
  getImageDimensions,
  convertToWebP,
  resizeImage,
  generateThumbnail,
};
