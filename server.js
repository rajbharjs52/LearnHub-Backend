// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');

dotenv.config();

const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const authRoutes      = require('./routes/authRoutes');
const notesRoutes     = require('./routes/notesRoutes');
const adminRoutes     = require('./routes/adminRoutes');
const aiRoutes        = require('./routes/aiRoutes');
const chatRoutes      = require('./routes/chatRoutes');
const commentRoutes   = require('./routes/commentRoutes');
const messageRoutes   = require('./routes/messageRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

connectDB();

const app = express();
const server = http.createServer(app);

// ✅ CORS — reads allowed origins from env
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL, // your Vercel URL goes here
].filter(Boolean); // remove undefined if FRONTEND_URL not set yet

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'],
}));

app.use(logger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Socket.io — also reads from env
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: No token'));
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.userId = decoded.user.id;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id} | UserID: ${socket.userId}`);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.userId} joined room ${roomId}`);
  });

  socket.on('sendMessage', async (data) => {
    try {
      if (!data.roomId || !data.text?.trim()) return;
      const message = new Message({
        room: data.roomId,
        sender: socket.userId,
        text: data.text.trim()
      });
      await message.save();
      const populatedMessage = await message.populate('sender', 'name profilePic');
      io.to(data.roomId).emit('newMessage', populatedMessage);
    } catch (err) {
      console.error('Message save error:', err);
      socket.emit('error', { msg: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/notes',     notesRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/ai',        aiRoutes);
app.use('/api/chat',      chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/comments',  commentRoutes);
app.use('/api/messages',  messageRoutes);

// Health check — Render pings this to keep server alive
app.get('/', (req, res) => {
  res.json({
    message: 'Student Knowledge Exchange Backend is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});