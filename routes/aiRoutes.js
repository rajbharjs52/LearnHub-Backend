// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ✅ NEW: Frontend calls this — accepts text in body
// POST /api/ai/summarize
router.post('/summarize', authMiddleware, aiController.summarizeText);

// KEPT: Old route — generates from note's own content
// POST /api/ai/summary/:noteId
router.post('/summary/:noteId', authMiddleware, aiController.generateSummary);

module.exports = router;