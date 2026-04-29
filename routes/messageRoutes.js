// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/chatController'); // Reuse sendMessage/getMessages
const {authMiddleware} = require('../middleware/authMiddleware');

// GET /api/messages/:roomId (protected)
router.get('/:roomId', authMiddleware, messageController.getMessages);

// POST /api/messages/:roomId (protected)
router.post('/:roomId', authMiddleware, messageController.sendMessage);

// PUT /api/messages/:messageId (protected, edit)
router.put('/:messageId', authMiddleware, async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (message.sender.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
  message.text = req.body.text || message.text;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();
  res.json(message);
});

// DELETE /api/messages/:messageId (protected, owner only)
router.delete('/:messageId', authMiddleware, async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (message.sender.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
  await message.deleteOne();
  res.json({ msg: 'Message deleted' });
});

module.exports = router;