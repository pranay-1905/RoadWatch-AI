import multer from 'multer';
import path from 'path';
import { supabase } from './db.js';

// Memory storage keeps file buffer in memory for direct upload to Supabase Storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'), false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB maximum file size
  fileFilter
});

/**
 * Upload an image file buffer directly into Supabase Storage bucket 'pothole-photos'
 * @param {Object} file - Express multer file object containing buffer
 * @param {string} folder - Subdirectory inside bucket ('edge', 'citizen', 'repairs')
 * @returns {Promise<string|null>} Public HTTPS URL of the uploaded image
 */
export const uploadToSupabaseStorage = async (file, folder = 'edge') => {
  if (!file || !file.buffer) return null;

  try {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    const filePath = `${folder}/img_${uniqueSuffix}${ext}`;

    const { data, error } = await supabase.storage
      .from('pothole-photos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('[SUPABASE STORAGE UPLOAD ERROR]:', error.message);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('pothole-photos')
      .getPublicUrl(filePath);

    console.log(`[SUPABASE STORAGE] Successfully saved image: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[STORAGE ERROR] Failed to save to Supabase bucket:', err.message);
    throw err;
  }
};

