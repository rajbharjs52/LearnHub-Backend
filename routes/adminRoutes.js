// // routes/adminRoutes.js
// const express = require('express');
// const router = express.Router();
// const adminController = require('../controllers/adminController');
// const { authMiddleware } = require('../middleware/authMiddleware');
// const roleMiddleware = require('../middleware/roleMiddleware');

// // Existing routes...
// router.get('/users', authMiddleware, roleMiddleware(['admin']), adminController.getUsers);
// router.delete('/users/:id', authMiddleware, roleMiddleware(['admin']), adminController.deleteUser);
// router.delete('/notes/:noteId', authMiddleware, roleMiddleware(['admin']), adminController.moderateNote);

// // NEW: Admin stats route
// router.get('/stats', authMiddleware, roleMiddleware(['admin']), adminController.getStats);

// module.exports = router;

// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const admin = [authMiddleware, roleMiddleware(['admin'])];

router.get('/stats',              ...admin, adminController.getStats);

// Users
router.get('/users',              ...admin, adminController.getUsers);
router.get('/users/:id',          ...admin, adminController.getUser);
router.put('/users/:id',          ...admin, adminController.updateUser);
router.delete('/users/:id',       ...admin, adminController.deleteUser);

// Notes
router.get('/notes',              ...admin, adminController.getNotes);
router.put('/notes/:noteId',      ...admin, adminController.updateNote);
router.delete('/notes/:noteId',   ...admin, adminController.deleteNote);

module.exports = router;