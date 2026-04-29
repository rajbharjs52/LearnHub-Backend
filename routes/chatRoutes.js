// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator'); // NEW: For validation
const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const chatController = require('../controllers/chatController');

// GET all relevant rooms for the logged-in user
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userCollege = req.user.college;

    // 1. All public rooms (visible to everyone)
    const allRooms = await ChatRoom.find({ isPrivate: false })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(30);

    // 2. Recommended rooms for this user (same college)
    const recommendedRooms = await ChatRoom.find({ 
      college: userCollege,
      isPrivate: false 
    })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(15);

    res.json({
      allRooms,
      recommended: recommendedRooms
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId)
      .populate('createdBy', 'name')
      .populate('participants', 'name');
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    const hasAccess = room.college === req.user.college || room.participants.some(p => p.equals(req.user.id));
    if (!hasAccess) return res.status(403).json({ msg: 'Not authorized' });

    res.json(room);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET messages for a specific room
router.get('/rooms/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId)
      .populate('createdBy', 'name');

    if (!room) return res.status(404).json({ msg: 'Room not found' });

    const messages = await Message.find({ room: req.params.roomId })
      .populate('sender', 'name profilePic')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({ room, messages });   // ← This is the only change
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST create new room (optional for MVP — can be auto-created later)
router.post('/rooms', [
  authMiddleware,
  body('name').trim().notEmpty().withMessage('Room name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long')
], async (req, res) => {
  try {
    // FIXED: Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ msg: errors.array()[0].msg });
    }

    const { name, subject, description } = req.body;
    const college = req.user.college; // From authMiddleware

    // FIXED: Check if room already exists (subject + college unique)
    const existingRoom = await ChatRoom.findOne({ subject, college });
    if (existingRoom) {
      return res.status(409).json({ msg: 'Room for this subject already exists in your college' });
    }

    const room = new ChatRoom({
      name,
      subject,
      college,
      description,
      createdBy: req.user.id,
      participants: [req.user.id] // FIXED: Auto-add creator
    });

    await room.save();
    const populatedRoom = await room.populate('createdBy', 'name'); // FIXED: Populate for response

    res.status(201).json(populatedRoom);
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// JOIN ROOM - Instant join, no restrictions
router.post('/rooms/:roomId/join', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    // Already a member? No-op, just return success
    if (room.participants.includes(req.user.id)) {
      return res.json({ msg: 'Already a member', room });
    }

    // Add user to participants
    room.participants.push(req.user.id);
    await room.save();

    // Populate for response
    const updatedRoom = await ChatRoom.findById(room._id)
      .populate('createdBy', 'name')
      .populate('participants', 'name');

    res.json(updatedRoom);
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE chatroom - Admin OR Creator only
router.delete('/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    // Check permission: Admin OR Creator
    const isAdmin = req.user.role === 'admin';
    const isCreator = room.createdBy.toString() === req.user.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ msg: 'Access denied: Only admin or creator can delete this room' });
    }

    // Delete all messages in this room first
    await Message.deleteMany({ room: req.params.roomId });

    // Delete the room
    await ChatRoom.deleteOne({ _id: req.params.roomId });

    res.json({ msg: 'Chat room and all its messages have been deleted successfully' });
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/rooms/:roomId/leave', authMiddleware, chatController.leaveRoom);

module.exports = router;