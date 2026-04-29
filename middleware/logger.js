// middleware/logger.js
const fs = require('fs');
const path = require('path');

// Ensure logs dir
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });

const logger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = `${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}\n`;
    console.log(logEntry.trim()); // Console
    accessLogStream.write(logEntry); // File
  });
  next();
};

module.exports = logger;