// config/cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('Cloudinary config error:', error);
  } else {
    console.log('Cloudinary connected:', result);
  }
});

/**
 * Generate a signed URL valid for 60 seconds
 * Works for both raw (PDF) and image resource types
 */
// config/cloudinary.js
// config/cloudinary.js - getSignedUrl
const getSignedUrl = (fileUrl, expiresInSeconds = 60) => {
  try {
    const isRaw = fileUrl.includes('/raw/upload/');
    const isVideo = fileUrl.includes('/video/upload/');
    const resourceType = isRaw ? 'raw' : isVideo ? 'video' : 'image';

    const uploadMarker = `/${resourceType}/upload/`;
    const splitIndex = fileUrl.indexOf(uploadMarker);
    if (splitIndex === -1) throw new Error('Could not find /upload/ in URL');

    let publicId = fileUrl.slice(splitIndex + uploadMarker.length);

    // ✅ Only strip extension if the filename actually HAS one (e.g. somefile.pdf)
    // Do NOT strip if it's a clean Cloudinary-generated ID (e.g. mg1n40xbduyjwhdlu2nq)
    if (resourceType === 'raw') {
      const lastDot = publicId.lastIndexOf('.');
      const lastSlash = publicId.lastIndexOf('/');
      const hasExtension = lastDot > lastSlash && lastDot > publicId.length - 6;
      // Only strip if extension is short (2-4 chars like .pdf .jpg .png)
      const ext = lastDot > -1 ? publicId.slice(lastDot) : '';
      const isRealExtension = /^\.(pdf|jpg|jpeg|png|gif|webp|doc|docx)$/i.test(ext);

      if (isRealExtension) {
        publicId = publicId.slice(0, lastDot);
      }
      // If no real extension found, leave publicId untouched
    }

    console.log('[Cloudinary] resourceType:', resourceType);
    console.log('[Cloudinary] publicId (cleaned):', publicId);

    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      type: 'upload',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
      secure: true,
      // ✅ Remove `format` entirely — don't force an extension onto clean IDs
    });

    console.log('[Cloudinary] Final signed URL:', signedUrl);
    return signedUrl;
  } catch (err) {
    console.error('[Cloudinary] getSignedUrl error:', err.message);
    return null;
  }
};


module.exports = cloudinary;
module.exports.getSignedUrl = getSignedUrl;