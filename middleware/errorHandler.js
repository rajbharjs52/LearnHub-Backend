// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack); // Log full stack in dev

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({ msg: message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ msg: `${field} already exists` });
  }

  // Default
  res.status(err.status || 500).json({ 
    msg: process.env.NODE_ENV === 'production' ? 'Server error' : err.message 
  });
};

module.exports = errorHandler;