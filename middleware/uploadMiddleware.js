// middleware/uploadMiddleware.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const path = require('path');

// ── Note file storage ──
const noteFileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdf = ext === '.pdf';
    return {
      folder: 'student-notes/files',
      resource_type: isPdf ? 'raw' : 'image',
      use_filename: false,
      unique_filename: true,
    };
  },
});

// ✅ Profile pic storage — separate folder, auto-optimize, square crop
const profilePicStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'student-notes/profile-pics',
      resource_type: 'image',
      use_filename: false,
      unique_filename: true,
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedNoteExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedNoteMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'file') {
    if (allowedNoteExtensions.includes(ext) && allowedNoteMimes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Note file: only JPG, PNG, PDF allowed'), false);
  }

  if (file.fieldname === 'coverImage' || file.fieldname === 'previewImage') {
    if (allowedImageExtensions.includes(ext) && allowedImageMimes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Images: only JPG, PNG, WEBP allowed'), false);
  }

  // ✅ Profile pic filter
  if (file.fieldname === 'profilePic') {
    if (allowedImageExtensions.includes(ext) && allowedImageMimes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Profile pic: only JPG, PNG, WEBP allowed'), false);
  }

  cb(null, true);
};

// ── Multi-field upload for notes ──
const multiUpload = (req, res, next) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (file.fieldname === 'file') {
        const isPdf = ext === '.pdf';
        return {
          folder: 'student-notes/files',
          resource_type: isPdf ? 'raw' : 'image',
          use_filename: false,
          unique_filename: true,
        };
      }
      return {
        folder: 'student-notes/images',
        resource_type: 'image',
        use_filename: false,
        unique_filename: true,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      };
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter,
  }).fields([
    { name: 'file', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
    { name: 'previewImage', maxCount: 1 },
  ]);

  upload(req, res, next);
};

module.exports = {
  singleUpload: multer({
    storage: noteFileStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter,
  }).single('file'),

  multiUpload,

  // ✅ Profile pic upload — single image, 5MB max
  profilePicUpload: multer({
    storage: profilePicStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
  }).single('profilePic'),
};