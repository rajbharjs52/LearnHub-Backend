// utils/generateToken.js
const jwt = require('jsonwebtoken');

const generateToken = (userId, type = 'access') => {
  const payload = { user: { id: userId } };
  const expiresIn = type === 'refresh' ? '7d' : '1h';
  const options = { expiresIn };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

module.exports = generateToken;