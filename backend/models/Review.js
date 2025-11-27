const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
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
  rating: {
    overall: { type: Number, required: true, min: 1, max: 5 },
    punctuality: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 },
    behavior: { type: Number, min: 1, max: 5 }
  },
  comment: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  images: [String],
  reply: {
    text: String,
    repliedAt: Date
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  helpful: {
    count: { type: Number, default: 0 },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }
}, {
  timestamps: true
});

// Update provider rating after review
reviewSchema.post('save', async function() {
  const Provider = mongoose.model('Provider');
  const reviews = await this.constructor.find({ provider: this.provider });
  
  const avgRating = reviews.reduce((acc, r) => acc + r.rating.overall, 0) / reviews.length;
  
  await Provider.findByIdAndUpdate(this.provider, {
    'rating.average': Math.round(avgRating * 10) / 10,
    'rating.count': reviews.length
  });
});

module.exports = mongoose.model('Review', reviewSchema);