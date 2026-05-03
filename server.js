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

const authRoutes = require('./routes/authRoutes');
const notesRoutes = require('./routes/notesRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const chatRoutes = require('./routes/chatRoutes');
const commentRoutes = require('./routes/commentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

connectDB();

const app = express();
const server = http.createServer(app);

// ==================== CORS CONFIG (Most Important) ====================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://learn-hub-frontend-lilac.vercel.app',   // ← Your Vercel frontend
];

// Add FRONTEND_URL from environment variable (if set in Render)
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

console.log('Allowed Origins:', allowedOrigins);

// Custom CORS middleware - Must be FIRST
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Fallback cors
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'x-auth-token', 'Authorization']
}));

// Other middleware
app.use(logger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.io
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Invalid token'));
    socket.userId = decoded.user.id;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} | UserID: ${socket.userId}`);

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
      const populated = await message.populate('sender', 'name profilePic');
      io.to(data.roomId).emit('newMessage', populated);
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
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running!', version: '1.0.0' });
});

app.use((req, res) => res.status(404).json({ msg: 'Route not found' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});