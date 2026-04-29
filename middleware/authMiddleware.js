// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const token = req.header('x-auth-token') || req.cookies?.token; // Header or cookie

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }

    req.user = user; // Attach full user object (includes role)
    next();
  } catch (err) {
    console.error('JWT Error:', err);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// NEW: Admin middleware (export for admin routes)
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.sta
    tus(403).json({ msg: 'Admin access required' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };