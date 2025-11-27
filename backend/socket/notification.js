const Notification = require('../models/Notification');

const setupNotification = (io, socket) => {
  // Get unread notifications count
  socket.on('get-unread-count', async () => {
    try {
      const count = await Notification.countDocuments({
        recipient: socket.userId,
        isRead: false
      });

      socket.emit('unread-count', { count });
    } catch (error) {
      socket.emit('error', { message: 'Failed to get notification count' });
    }
  });

  // Get recent notifications
  socket.on('get-notifications', async (data) => {
    const { page = 1, limit = 20 } = data || {};
    const skip = (page - 1) * limit;

    try {
      const notifications = await Notification.find({ recipient: socket.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments({ recipient: socket.userId });

      socket.emit('notifications', {
        notifications,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to get notifications' });
    }
  });

  // Mark notification as read
  socket.on('mark-read', async (data) => {
    const { notificationId } = data;

    try {
      await Notification.findByIdAndUpdate(notificationId, {
        isRead: true,
        readAt: new Date()
      });

      socket.emit('notification-read', { notificationId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read
  socket.on('mark-all-read', async () => {
    try {
      await Notification.updateMany(
        { recipient: socket.userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      socket.emit('all-notifications-read');
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark notifications as read' });
    }
  });

  // Admin joins dashboard room
  socket.on('join-admin-dashboard', () => {
    if (socket.userRole === 'admin') {
      socket.join('admin_dashboard');
      socket.emit('joined-admin-dashboard');
    }
  });
};

// Helper function to send notification
const sendNotification = async (io, notification) => {
  try {
    const newNotification = await Notification.create(notification);
    
    const roomPrefix = notification.recipientModel === 'Provider' ? 'provider' : 'user';
    io.to(`${roomPrefix}_${notification.recipient}`).emit('new-notification', newNotification);

    return newNotification;
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

module.exports = setupNotification;
module.exports.sendNotification = sendNotification;