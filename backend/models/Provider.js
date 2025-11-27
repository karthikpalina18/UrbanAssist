const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const providerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  avatar: {
    type: String,
    default: 'default-provider.png'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service category is required']
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  experience: {
    type: Number,
    required: [true, 'Experience in years is required'],
    min: 0
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  serviceArea: {
    radius: { type: Number, default: 10 }, // in km
    city: String,
    state: String
  },
  availability: {
    isAvailable: { type: Boolean, default: true },
    schedule: [{
      day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      startTime: String,
      endTime: String
    }]
  },
  documents: {
    aadhar: { url: String, verified: { type: Boolean, default: false } },
    photo: { url: String, verified: { type: Boolean, default: false } },
    certificate: { url: String, verified: { type: Boolean, default: false } }
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  completedJobs: { type: Number, default: 0 },
  earnings: {
    total: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
  },
  role: {
    type: String,
    default: 'provider'
  }
}, {
  timestamps: true
});

// Index for geospatial queries
providerSchema.index({ currentLocation: '2dsphere' });

// Hash password before saving
providerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT token
providerSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: 'provider' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match password
providerSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Provider', providerSchema);