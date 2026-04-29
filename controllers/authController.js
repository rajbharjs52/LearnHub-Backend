// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authController = {

  async signup(req, res) {
    const { name, email, password, college, course } = req.body;
    try {
      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ msg: 'User already exists' });

      user = new User({ name, email, password, college, course, role: 'user' });
      await user.save();

      const payload = { user: { id: user.id } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

      res.status(201).json({
        token,
        user: { id: user.id, name, email, college, course, role: user.role }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  async login(req, res) {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

      const payload = { user: { id: user.id } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          college: user.college,
          course: user.course,
          role: user.role,
          profilePic: user.profilePic || null,
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  async getMe(req, res) {
    try {
      const user = await User.findById(req.user.id)
        .select('-password')
        .populate('savedNotes', 'title subject likeCount');
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // ✅ Update profile — name, email, college, course, bio
  async updateProfile(req, res) {
    try {
      const { name, email, college, course, bio } = req.body;
      const allowed = {};
      if (name)    allowed.name    = name.trim();
      if (email)   allowed.email   = email.trim().toLowerCase();
      if (college) allowed.college = college.trim();
      if (course)  allowed.course  = course.trim();
      if (bio !== undefined) allowed.bio = bio.trim();

      // Check email uniqueness if changed
      if (email) {
        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing && existing._id.toString() !== req.user.id) {
          return res.status(400).json({ msg: 'Email already in use' });
        }
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: allowed },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) return res.status(404).json({ msg: 'User not found' });

      res.json(user);
    } catch (err) {
      console.error('[Auth] updateProfile error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // ✅ Update profile pic — receives file from multer
  async updateProfilePic(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: 'No image uploaded' });
      }

      // req.file.path is the Cloudinary URL from CloudinaryStorage
      const profilePicUrl = req.file.path;

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: { profilePic: profilePicUrl } },
        { new: true }
      ).select('-password');

      if (!user) return res.status(404).json({ msg: 'User not found' });

      console.log('[Auth] Profile pic updated:', profilePicUrl);
      res.json({ profilePic: user.profilePic, user });
    } catch (err) {
      console.error('[Auth] updateProfilePic error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // ✅ Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ msg: 'Both passwords required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters' });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ msg: 'User not found' });

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }

      user.password = newPassword; // pre-save hook hashes it
      await user.save();

      res.json({ msg: 'Password changed successfully' });
    } catch (err) {
      console.error('[Auth] changePassword error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },
};

module.exports = authController;