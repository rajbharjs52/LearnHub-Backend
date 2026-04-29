// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest, userSignupSchema } = require('../middleware/validateRequest');
const { authMiddleware } = require('../middleware/authMiddleware');
const { profilePicUpload } = require('../middleware/uploadMiddleware');

router.post('/signup', validateRequest(userSignupSchema), authController.signup);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);

// ✅ New routes
router.put('/profile',     authMiddleware, authController.updateProfile);
router.put('/profile-pic', authMiddleware, profilePicUpload, authController.updateProfilePic);
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;