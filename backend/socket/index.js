const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const setupProviderLocation = require('./providerLocation');
const setupNotification = require('./notification');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userRole})`);

    // Join user-specific room
    const roomPrefix = socket.userRole === 'provider' ? 'provider' : 'user';
    socket.join(`${roomPrefix}_${socket.userId}`);

    // Setup event handlers
    setupProviderLocation(io, socket);
    setupNotification(io, socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

module.exports = initializeSocket;