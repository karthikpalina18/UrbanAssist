const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['User', 'Provider']
  },
  type: {
    type: String,
    required: true,
    enum: [
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'booking_completed',
      'provider_assigned',
      'provider_arriving',
      'payment_received',
      'review_received',
      'promotion',
      'system'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    bookingId: mongoose.Schema.Types.ObjectId,
    providerId: mongoose.Schema.Types.ObjectId,
    serviceId: mongoose.Schema.Types.ObjectId,
    link: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

// Index for faster queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);