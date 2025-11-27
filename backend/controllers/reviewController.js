const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment, images } = req.body;

    // Check if booking exists and is completed
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings'
      });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Booking already reviewed'
      });
    }

    const review = await Review.create({
      booking: bookingId,
      user: req.user._id,
      provider: booking.provider,
      service: booking.service,
      rating,
      comment,
      images
    });

    // Update booking with review reference
    booking.rating = review._id;
    await booking.save();

    await review.populate([
      { path: 'user', select: 'name avatar' },
      { path: 'service', select: 'title' }
    ]);

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get reviews for provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
exports.getProviderReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ provider: req.params.providerId })
      .populate('user', 'name avatar')
      .populate('service', 'title')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Review.countDocuments({ provider: req.params.providerId });

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { provider: require('mongoose').Types.ObjectId(req.params.providerId) } },
      { $group: { _id: '$rating.overall', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      ratingDistribution,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
exports.getReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'name avatar')
      .populate('provider', 'name avatar')
      .populate('service', 'title');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { rating, comment, images } = req.body;

    review = await Review.findByIdAndUpdate(
      req.params.id,
      { rating, comment, images },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await review.deleteOne();

    // Recalculate provider rating
    const reviews = await Review.find({ provider: review.provider });
    const avgRating = reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating.overall, 0) / reviews.length
      : 0;

    await Provider.findByIdAndUpdate(review.provider, {
      'rating.average': Math.round(avgRating * 10) / 10,
      'rating.count': reviews.length
    });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reply to review (Provider)
// @route   PUT /api/reviews/:id/reply
// @access  Private/Provider
exports.replyToReview = async (req, res) => {
  try {
    const { text } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.provider.toString() !== req.provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    review.reply = {
      text,
      repliedAt: new Date()
    };
    await review.save();

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark review as helpful
// @route   PUT /api/reviews/:id/helpful
// @access  Private
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const alreadyMarked = review.helpful.users.includes(req.user._id);

    if (alreadyMarked) {
      // Remove helpful
      review.helpful.users = review.helpful.users.filter(
        id => id.toString() !== req.user._id.toString()
      );
      review.helpful.count -= 1;
    } else {
      // Add helpful
      review.helpful.users.push(req.user._id);
      review.helpful.count += 1;
    }

    await review.save();

    res.status(200).json({
      success: true,
      data: { helpful: review.helpful.count, marked: !alreadyMarked }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};