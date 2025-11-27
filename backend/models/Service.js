const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Service description is required']
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Electrician',
      'Plumber',
      'Cleaner',
      'Carpenter',
      'Painter',
      'AC Technician',
      'Appliance Repair',
      'Pest Control',
      'Gardening',
      'Moving & Packing',
      'Other'
    ]
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: 0
  },
  priceType: {
    type: String,
    enum: ['fixed', 'hourly', 'per_km'],
    default: 'fixed'
  },
  duration: {
    estimated: { type: Number, default: 60 }, // in minutes
    unit: { type: String, default: 'minutes' }
  },
  image: {
    type: String,
    default: 'default-service.png'
  },
  icon: {
    type: String,
    default: 'wrench'
  },
  tags: [String],
  requirements: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  popularity: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create slug from title
serviceSchema.pre('save', function(next) {
  this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  next();
});

module.exports = mongoose.model('Service', serviceSchema);