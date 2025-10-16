const socketAuth = require('../middleware/socketAuth');

// In-memory storage for chat messages (in production, use Redis or database)
const chatMessages = new Map(); // agreementId -> messages[]
const userRooms = new Map(); // userId -> Set of agreementIds

const setupChatHandler = (io) => {
  // Apply authentication middleware
  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userName} (${socket.userId})`);

    // Join agreement chat room
    socket.on('join-agreement-chat', ({ agreementId }) => {
      try {
        console.log(`📝 User ${socket.userName} joining agreement chat: ${agreementId}`);
        
        // Join the room
        socket.join(`agreement-${agreementId}`);
        
        // Track user's rooms
        if (!userRooms.has(socket.userId)) {
          userRooms.set(socket.userId, new Set());
        }
        userRooms.get(socket.userId).add(agreementId);
        
        // Initialize messages for this agreement if not exists
        if (!chatMessages.has(agreementId)) {
          chatMessages.set(agreementId, []);
        }
        
        // Send chat history to the user
        const messages = chatMessages.get(agreementId) || [];
        socket.emit('chat-history', messages);
        
        // Notify other users in the room that someone joined
        socket.to(`agreement-${agreementId}`).emit('user-joined', {
          userId: socket.userId,
          userName: socket.userName
        });
        
        console.log(`✅ User ${socket.userName} joined agreement chat: ${agreementId}`);
      } catch (error) {
        console.error('Error joining agreement chat:', error);
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });

    // Handle sending messages
    socket.on('send-message', ({ agreementId, message, timestamp }) => {
      try {
        console.log(`📨 Message from ${socket.userName} in agreement ${agreementId}: ${message}`);
        
        const messageData = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          senderId: socket.userId,
          senderName: socket.userName,
          message: message,
          timestamp: new Date(timestamp),
          isOwn: false // Will be set to true by the sender's client
        };
        
        // Store message
        if (!chatMessages.has(agreementId)) {
          chatMessages.set(agreementId, []);
        }
        chatMessages.get(agreementId).push(messageData);
        
        // Send to all users in the room (including sender)
        io.to(`agreement-${agreementId}`).emit('message-received', messageData);
        
        console.log(`✅ Message broadcasted to agreement ${agreementId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userName} (${socket.userId})`);
      
      // Notify all rooms this user was in
      if (userRooms.has(socket.userId)) {
        const userAgreements = userRooms.get(socket.userId);
        userAgreements.forEach(agreementId => {
          socket.to(`agreement-${agreementId}`).emit('user-left', {
            userId: socket.userId,
            userName: socket.userName
          });
        });
        userRooms.delete(socket.userId);
      }
    });

    // Handle agreement signature updates
    socket.on('agreement-signed', ({ agreementId, userId, userName }) => {
      try {
        console.log(`✍️ Agreement signed by ${userName} in agreement ${agreementId}`);
        
        // Notify all users in the agreement room
        socket.to(`agreement-${agreementId}`).emit('signature-updated', {
          agreementId,
          userId,
          userName,
          timestamp: new Date()
        });
        
        console.log(`✅ Signature update broadcasted for agreement ${agreementId}`);
      } catch (error) {
        console.error('Error handling signature update:', error);
        socket.emit('error', { message: 'Failed to broadcast signature update' });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Chat handler setup complete');
};

module.exports = setupChatHandler;
