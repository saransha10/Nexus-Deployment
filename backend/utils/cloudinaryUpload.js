const cloudinary = require('../config/cloudinary');
const fs = require('fs');

/**
 * Upload a file to Cloudinary and delete the local temp file
 * @param {string} filePath - Local path to the file
 * @param {string} folder - Cloudinary folder (e.g. 'nexus/events' or 'nexus/profiles')
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadToCloudinary = async (filePath, folder = 'nexus') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    // Delete local temp file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    // Clean up temp file even on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

/**
 * Delete an image from Cloudinary by public_id
 * @param {string} publicId - Cloudinary public_id
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete from Cloudinary:', error);
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
