// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');

// Load env vars
dotenv.config();

// Import connectDB
const connectDB = require('./config/db');

// Import middleware
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const notesRoutes = require('./routes/notesRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const chatRoutes = require('./routes/chatRoutes');
const commentRoutes = require('./routes/commentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
// Connect to DB
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173', // Adjust for frontend port
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(logger); // Request logging
app.use(express.json({ limit: '10mb' })); // For file uploads later
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.io for real-time chat (Phase 3 teaser)
// Socket.io for real-time chat
// ====================== SOCKET.IO SETUP ======================
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: No token'));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.userId = decoded.user.id;   // Attach user ID for later use
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id} | UserID: ${socket.userId}`);

  // Join Room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.userId} joined room ${roomId}`);
  });

  // 🔥 Send Message + Save to MongoDB
  socket.on('sendMessage', async (data) => {
    try {
      if (!data.roomId || !data.text?.trim()) return;

      const message = new Message({
        room: data.roomId,
        sender: socket.userId,
        text: data.text.trim()
      });

      await message.save();

      // Populate sender name before broadcasting
      const populatedMessage = await message.populate('sender', 'name');

      // Broadcast to everyone in the room
      io.to(data.roomId).emit('newMessage', populatedMessage);

      console.log(`Message saved & broadcasted in room ${data.roomId}`);
    } catch (err) {
      console.error('Message save error:', err);
      socket.emit('error', { msg: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});
// ====================== END SOCKET.IO ======================

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/comments', commentRoutes);
app.use('/api/messages', messageRoutes);

// Basic health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Student Knowledge Exchange Backend is running!', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler (Express 5 compatible wildcard)
// 404 handler (pathless for Express 5 compatibility—no wildcard parsing)
app.use((req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

// Error handling middleware (global)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown (complements db.js)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
