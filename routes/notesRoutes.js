// routes/notesRoutes.js
const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');
const likeController = require('../controllers/likeController');
const commentController = require('../controllers/commentController');
const { multiUpload } = require('../middleware/uploadMiddleware'); // ✅ changed
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateRequest, noteSchema } = require('../middleware/validateRequest');

router.get('/', notesController.getNotes);
router.get('/:id', authMiddleware, notesController.getNote);
router.get('/:id/download', authMiddleware, notesController.downloadNote);
router.get('/:id/preview-url', authMiddleware, notesController.getPreviewUrl);

// ✅ multiUpload instead of singleUpload
router.post('/', authMiddleware, multiUpload, validateRequest(noteSchema), notesController.createNote);

router.put('/:id', authMiddleware, notesController.updateNote);
router.delete('/:id', authMiddleware, notesController.deleteNote);
router.put('/:id/like', authMiddleware, likeController.toggleNoteLike);
// GET comments for a note (populated)
router.get('/:id/comments', authMiddleware, commentController.getComments);
router.post('/:id/comments', authMiddleware, commentController.createComment);

module.exports = router;