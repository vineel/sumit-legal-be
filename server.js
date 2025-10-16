require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(require('./logger-middleware'));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
  }
});

app.use(cors(corsOptions));
app.use(express.json());


// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// connect DB
connectDB();

// Make io available to routes
app.set('io', io);

// Setup chat handler
const setupChatHandler = require('./src/socket/chatHandler');
setupChatHandler(io);

// Set socket instance for agreement controller
const agreementController = require('./src/controller/agreement.controller');
agreementController.setSocketIO(io);

// routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const adminRoutes = require('./src/routes/admin.routes');
const clauseRoutes = require('./src/routes/clause.routes');
const agreementRoutes = require('./src/routes/agreement.routes');
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/clause', clauseRoutes);
app.use('/api/agreement', agreementRoutes);




// 👉 Public hello route
app.get('/', (req, res) => {
  res.json({ message: 'Hello World! Welcome to IBD Contracting Platform API 🚀' });
});

// protected route example
const { authMiddleware } = require('./src/middleware/auth');
const { permit } = require('./src/middleware/role');

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Hello user', user: req.user });
});

 


// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);
  console.log('🌐 Socket origin:', socket.handshake.headers.origin);
  console.log('🌐 Socket user-agent:', socket.handshake.headers['user-agent']);
  console.log('🌐 Socket query:', socket.handshake.query);
  console.log('🌐 Socket transport:', socket.handshake.transport);

  // Join agreement room
  socket.on('join-agreement', (data) => {
    const agreementId = data.agreementId || data;
    const userId = data.userId || socket.id;
    
    socket.join(`agreement-${agreementId}`);
    console.log(`📡 User ${userId} (${socket.id}) joined agreement ${agreementId}`);
    
    // Get online users count for this room
    const room = io.sockets.adapter.rooms.get(`agreement-${agreementId}`);
    const onlineCount = room ? room.size : 0;
    
    // Notify all users in the room about the new user and online count
    io.to(`agreement-${agreementId}`).emit('user-joined', { 
      userId: userId,
      socketId: socket.id,
      userName: data.userName || 'Unknown User',
      onlineCount: onlineCount
    });
    
    console.log(`👥 Online users in agreement ${agreementId}: ${onlineCount}`);
  });

  // Leave agreement room
  socket.on('leave-agreement', (data) => {
    const agreementId = data.agreementId || data;
    const userId = data.userId || socket.id;
    
    socket.leave(`agreement-${agreementId}`);
    console.log(`❌ User ${userId} (${socket.id}) left agreement ${agreementId}`);
    
    // Get updated online users count for this room
    const room = io.sockets.adapter.rooms.get(`agreement-${agreementId}`);
    const onlineCount = room ? room.size : 0;
    
    // Notify others in the room
    socket.to(`agreement-${agreementId}`).emit('user-left', { 
      userId: userId,
      socketId: socket.id,
      userName: data.userName || 'Unknown User',
      onlineCount: onlineCount
    });
    
    console.log(`👥 Online users in agreement ${agreementId}: ${onlineCount}`);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    console.log('📤 Received message via Socket.IO:', data);
    // Broadcast to all clients in the room (including sender)
    io.to(`agreement-${data.agreementId}`).emit('message', data);
    console.log(`📡 Message broadcasted to room: agreement-${data.agreementId}`);
  });

  // Handle clause updates
  socket.on('update-clause', (data) => {
    console.log('Received clause update:', data);
    socket.to(`agreement-${data.agreementId}`).emit('clause-updated', data);
  });

  // Handle agreement status changes
  socket.on('agreement-status-change', (data) => {
    console.log('Received status change:', data);
    socket.to(`agreement-${data.agreementId}`).emit('agreement-status-updated', data);
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    console.log('User started typing:', data);
    socket.to(`agreement-${data.agreementId}`).emit('user-typing', {
      userId: data.userId,
      userName: data.userName,
      agreementId: data.agreementId
    });
  });

  socket.on('typing-stop', (data) => {
    console.log('User stopped typing:', data);
    socket.to(`agreement-${data.agreementId}`).emit('user-stopped-typing', {
      userId: data.userId,
      userName: data.userName,
      agreementId: data.agreementId
    });
  });

  // Handle agreement signing
  socket.on('agreement-signed', (data) => {
    console.log('Received agreement signed:', data);
    socket.to(`agreement-${data.agreementId}`).emit('agreement-signed', data);
  });

  // Handle custom clause additions
  socket.on('custom-clause-added', (data) => {
    console.log('Received custom clause:', data);
    socket.to(`agreement-${data.agreementId}`).emit('custom-clause-added', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running in ${ENV} mode on port ${PORT}`);
  console.log(`🔌 Socket.io server ready`);
});
