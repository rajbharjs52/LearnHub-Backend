// // controllers/adminController.js
// const User = require('../models/User');
// const Note = require('../models/Note');
// const Comment = require('../models/Comment');
// const ChatRoom = require('../models/ChatRoom');
// const Message = require('../models/Message');

// const adminController = {
//   // NEW: Get admin stats (global overview)
//   async getStats(req, res) {
//     try {
//       const totalUsers = await User.countDocuments();
//       const totalNotes = await Note.countDocuments();
//       const totalComments = await Comment.countDocuments();
//       const totalRooms = await ChatRoom.countDocuments();
//       const totalMessages = await Message.countDocuments();

//       // Recent users (last 5)
//       const recentUsers = await User.find()
//         .sort({ createdAt: -1 })
//         .limit(5)
//         .select('name email college createdAt');

//       // Pending moderation notes (assume 'status' field; add if not)
//       const pendingNotes = await Note.countDocuments({ status: 'pending' });

//       res.json({
//         stats: {
//           totalUsers,
//           totalNotes,
//           totalComments,
//           totalRooms,
//           totalMessages,
//           pendingNotes
//         },
//         recent: {
//           users: recentUsers
//         }
//       });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ msg: 'Server error' });
//     }
//   },

//   // Existing methods (getUsers, deleteUser, moderateNote)
//   async getUsers(req, res) {
//     // Stub—implement as needed
//     const users = await User.find().select('-password');
//     res.json(users);
//   },

//   async deleteUser(req, res) {
//     // Stub
//     await User.findByIdAndDelete(req.params.id);
//     res.json({ msg: 'User deleted' });
//   },

//   async moderateNote(req, res) {
//     // Stub
//     await Note.findByIdAndDelete(req.params.noteId);
//     res.json({ msg: 'Note moderated' });
//   }
// };

// module.exports = adminController;

// controllers/adminController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Note = require('../models/Note');
const Comment = require('../models/Comment');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

const adminController = {

  async getStats(req, res) {
    try {
      const totalUsers = await User.countDocuments();
      const totalNotes = await Note.countDocuments();
      const totalComments = await Comment.countDocuments();
      const totalRooms = await ChatRoom.countDocuments();
      const totalMessages = await Message.countDocuments();
      const recentUsers = await User.find()
        .sort({ createdAt: -1 }).limit(5)
        .select('name email college createdAt');
      res.json({
        stats: { totalUsers, totalNotes, totalComments, totalRooms, totalMessages },
        recent: { users: recentUsers }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // ✅ Get all users with pagination + search
async getUsers(req, res) {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } },
      ]
    } : {};

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // ✅ toObject() gives both id and _id — keep _id as string explicitly
    const usersWithId = users.map(u => {
      const obj = u.toObject({ virtuals: false });
      obj._id = obj._id.toString();
      return obj;
    });

    res.json({ users: usersWithId, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Admin] getUsers error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
},

  // ✅ Get single user
async getUser(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid user ID' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const noteCount = await Note.countDocuments({ uploader: req.params.id });
    const commentCount = await Comment.countDocuments({ user: req.params.id });

    const obj = user.toObject();
    obj._id = obj._id.toString(); // ✅ ensure string

    res.json({ ...obj, noteCount, commentCount });
  } catch (err) {
    console.error('[Admin] getUser error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
},

  // ✅ Update user — name, email, role, college
  async updateUser(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Invalid user ID' });
      }
      const { name, email, role, college } = req.body;
      const allowed = {};
      if (name) allowed.name = name.trim();
      if (email) allowed.email = email.trim().toLowerCase();
      if (role && ['user', 'admin'].includes(role)) allowed.role = role;
      if (college) allowed.college = college.trim();

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: allowed },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) return res.status(404).json({ msg: 'User not found' });
      res.json(user);
    } catch (err) {
      console.error('[Admin] updateUser error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // ✅ Delete user + their notes and comments
  async deleteUser(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Invalid user ID' });
      }
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ msg: 'User not found' });

      // Prevent admin from deleting themselves
      if (req.params.id === req.user.id.toString()) {
        return res.status(400).json({ msg: 'Cannot delete your own account' });
      }

      await Note.deleteMany({ uploader: req.params.id });
      await Comment.deleteMany({ user: req.params.id });
      await User.findByIdAndDelete(req.params.id);

      res.json({ msg: 'User and their content deleted successfully' });
    } catch (err) {
      console.error('[Admin] deleteUser error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // ✅ Get all notes with pagination + search
  async getNotes(req, res) {
  try {
    const { search = '', subject = '', page = 1, limit = 10 } = req.query;
    const query = {};
    if (subject) query.subject = subject;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Note.countDocuments(query);
    const notes = await Note.find(query)
      .populate('uploader', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // ✅ Ensure _id is always a plain string
    const notesWithId = notes.map(n => {
      const obj = n.toObject({ virtuals: false });
      obj._id = obj._id.toString();
      if (obj.uploader?._id) obj.uploader._id = obj.uploader._id.toString();
      return obj;
    });

    res.json({ notes: notesWithId, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Admin] getNotes error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
},


  // ✅ Update note — title, description, subject, college
  async updateNote(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.noteId)) {
        return res.status(400).json({ msg: 'Invalid note ID' });
      }
      const { title, description, subject, college, tags } = req.body;
      const allowed = {};
      if (title) allowed.title = title.trim();
      if (description) allowed.description = description.trim();
      if (subject) allowed.subject = subject.trim();
      if (college) allowed.college = college.trim();
      if (tags && typeof tags === 'string') {
        allowed.tags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      }

      const note = await Note.findByIdAndUpdate(
        req.params.noteId,
        { $set: allowed },
        { new: true, runValidators: true }
      ).populate('uploader', 'name email');

      if (!note) return res.status(404).json({ msg: 'Note not found' });
      res.json(note);
    } catch (err) {
      console.error('[Admin] updateNote error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // ✅ Delete note + its comments
  async deleteNote(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.noteId)) {
        return res.status(400).json({ msg: 'Invalid note ID' });
      }
      const note = await Note.findById(req.params.noteId);
      if (!note) return res.status(404).json({ msg: 'Note not found' });

      await Comment.deleteMany({ note: req.params.noteId });
      await Note.findByIdAndDelete(req.params.noteId);

      res.json({ msg: 'Note and its comments deleted successfully' });
    } catch (err) {
      console.error('[Admin] deleteNote error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // kept for backward compat
  async moderateNote(req, res) {
    return adminController.deleteNote(
      { ...req, params: { noteId: req.params.noteId } },
      res
    );
  },
};

module.exports = adminController;