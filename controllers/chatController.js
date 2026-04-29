// controllers/chatController.js
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

const chatController = {
  // Create/join room
  async createRoom(req, res) {
    const { name, subject, college, description, isPrivate } = req.body;

    try {
      let room = await ChatRoom.findOne({ name });
      if (room) return res.status(400).json({ msg: 'Room already exists' });

      room = new ChatRoom({
        name, subject, college, description, isPrivate,
        createdBy: req.user.id,
        participants: [req.user.id]
      });

      await room.save();
      await room.populate('createdBy', 'name');

      res.status(201).json(room);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // Get rooms (filtered)
  async getRooms(req, res) {
    try {
      const { subject, college } = req.query;
      const filter = { isPrivate: false }; // Public by default

      if (subject) filter.subject = subject;
      if (college) filter.college = college;

      const rooms = await ChatRoom.find(filter)
        .populate('createdBy', 'name college')
        .populate('participants', 'name');

      res.json(rooms);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // Get messages in room
  async getMessages(req, res) {
    try {
      const messages = await Message.find({ roomId: req.params.roomId })
        .populate('sender', 'name profilePic')
        .sort({ createdAt: -1 })
        .limit(50);

      res.json(messages.reverse()); // Oldest first for UI
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // Send message (REST fallback; use Socket.io primarily)
  async sendMessage(req, res) {
    const { text, attachment } = req.body;

    try {
      const message = new Message({
        roomId: req.params.roomId,
        sender: req.user.id,
        text,
        attachment
      });

      
      await message.save();
      await message.populate('sender', 'name profilePic');

      res.status(201).json(message);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // controllers/chatController.js — add this method
async leaveRoom(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    // Creator cannot leave — must delete instead
    if (room.createdBy?.toString() === userId.toString()) {
      return res.status(400).json({ msg: 'Room creator cannot leave. Delete the room instead.' });
    }

    // Remove from participants
    room.participants = room.participants.filter(
      p => p.toString() !== userId.toString()
    );
    await room.save();

    res.json({ msg: 'Left room successfully' });
  } catch (err) {
    console.error('[Chat] leaveRoom error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}
};


module.exports = chatController;