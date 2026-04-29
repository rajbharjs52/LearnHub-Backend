// controllers/dashboardController.js
const User = require('../models/User');
const Note = require('../models/Note');
const Comment = require('../models/Comment');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

const dashboardController = {
  async getDashboard(req, res) {
    try {
      const userId = req.user.id;
      console.log('Dashboard requested by user:', userId, 'Role:', req.user.role);

      const isAdmin = req.user.role === 'admin';

      if (isAdmin) {
        const totalUsers = await User.countDocuments();
        const totalNotes = await Note.countDocuments();
        const pendingModeration = 0; // You can add status field later

        const recentUsers = await User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name email college');

        return res.json({
          role: 'admin',
          stats: { totalUsers, totalNotes, pendingModeration },
          recent: { users: recentUsers }
        });
      } 

      // === USER DASHBOARD ===
      const uploadedNotes = await Note.find({ uploader: userId })
        .populate('summary', 'content')
        .sort({ createdAt: -1 })
        .limit(5);

      const uploadedCount = await Note.countDocuments({ uploader: userId });

      const userDoc = await User.findById(userId).populate('savedNotes', 'title subject likeCount');
      const savedNotes = userDoc?.savedNotes || [];

      const likeCount = 
        await Note.countDocuments({ likes: userId }) + 
        await Comment.countDocuments({ likes: userId });

      const recentComments = await Comment.find({ user: userId })
        .populate('note', 'title')
        .sort({ createdAt: -1 })
        .limit(5);

      const chatRooms = await ChatRoom.find({ 
        $or: [{ createdBy: userId }, { participants: userId }] 
      })
        .populate('participants', 'name')
        .sort({ createdAt: -1 })
        .limit(3);

      const recentMessages = await Message.find({ sender: userId })
        .populate('room', 'name')
        .sort({ createdAt: -1 })
        .limit(10);

      res.json({
        role: 'user',
        user: { 
          name: userDoc.name, 
          college: userDoc.college, 
          course: userDoc.course 
        },
        stats: {
          uploadedNotes: uploadedCount,
          savedNotes: savedNotes.length,
          likesGiven: likeCount,
          commentsMade: await Comment.countDocuments({ user: userId })
        },
        recent: {
          notes: uploadedNotes,
          comments: recentComments,
          chatRooms,
          messages: recentMessages
        }
      });

    } catch (err) {
      console.error('Dashboard error details:', err);
      res.status(500).json({ 
        msg: 'Server error', 
        error: err.message 
      });
    }
  }
};

module.exports = dashboardController;