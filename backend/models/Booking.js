const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  location: {
    address: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    landmark: String
  },
  schedule: {
    date: { type: Date, required: true },
    timeSlot: {
      start: { type: String, required: true },
      end: { type: String, required: true }
    }
  },
  pricing: {
    basePrice: { type: Number, required: true },
    distanceCharge: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }
  },
  distance: {
    value: Number, // in km
    text: String
  },
  duration: {
    estimated: Number, // in minutes
    actual: Number
  },
  payment: {
    method: { type: String, enum: ['cash', 'card', 'upi', 'wallet'], default: 'cash' },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    transactionId: String,
    paidAt: Date
  },
  otp: {
    code: String,
    expiresAt: Date,
    verified: { type: Boolean, default: false }
  },
  notes: String,
  cancellation: {
    reason: String,
    cancelledBy: { type: String, enum: ['user', 'provider', 'admin'] },
    cancelledAt: Date
  },
  completedAt: Date,
  rating: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }
}, {
  timestamps: true
});

// Index for geospatial queries
bookingSchema.index({ 'location.coordinates': '2dsphere' });

// Generate booking ID
bookingSchema.pre('save', function(next) {
  if (!this.bookingId) {
    this.bookingId = 'UA' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);