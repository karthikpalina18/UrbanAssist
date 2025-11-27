const Provider = require('../models/Provider');
const Booking = require('../models/Booking');
const { getAIRecommendation } = require('../utils/aiService');

// @desc    Get all providers
// @route   GET /api/providers
// @access  Public
exports.getProviders = async (req, res) => {
  try {
    const { category, available, lat, lng, radius = 10, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { status: 'approved' };

    if (category) query.category = category;
    if (available) query['availability.isAvailable'] = available === 'true';

    // Geospatial query if coordinates provided
    if (lat && lng) {
      query.currentLocation = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius) * 1000 // Convert km to meters
        }
      };
    }

    const providers = await Provider.find(query)
      .select('-password -bankDetails')
      .populate('category', 'title')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Provider.countDocuments(query);

    res.status(200).json({
      success: true,
      count: providers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: providers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single provider
// @route   GET /api/providers/:id
// @access  Public
exports.getProvider = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .select('-password -bankDetails')
      .populate('category', 'title description')
      .populate('services', 'title basePrice');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.status(200).json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get nearby providers
// @route   GET /api/providers/nearby
// @access  Public
exports.getNearbyProviders = async (req, res) => {
  try {
    const { lat, lng, category, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const query = {
      status: 'approved',
      'availability.isAvailable': true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius) * 1000
        }
      }
    };

    if (category) query.category = category;

    const providers = await Provider.find(query)
      .select('name avatar rating currentLocation category experience completedJobs')
      .populate('category', 'title')
      .limit(20);

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get AI recommended provider
// @route   POST /api/providers/recommend
// @access  Private
exports.getRecommendedProvider = async (req, res) => {
  try {
    const { serviceId, lat, lng } = req.body;

    if (!serviceId || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide service ID and location'
      });
    }

    const recommendation = await getAIRecommendation({
      serviceId,
      userLat: lat,
      userLng: lng
    });

    res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update provider profile
// @route   PUT /api/providers/profile
// @access  Private/Provider
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'avatar', 'experience', 'serviceArea', 'availability'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const provider = await Provider.findByIdAndUpdate(
      req.provider._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update provider location
// @route   PUT /api/providers/location
// @access  Private/Provider
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const provider = await Provider.findByIdAndUpdate(
      req.provider._id,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      },
      { new: true }
    );

    // Emit location update via Socket.io
    const io = req.app.get('io');
    io.emit('provider-location-update', {
      providerId: provider._id,
      location: { lat, lng }
    });

    res.status(200).json({ success: true, data: provider.currentLocation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle provider availability
// @route   PUT /api/providers/availability
// @access  Private/Provider
exports.toggleAvailability = async (req, res) => {
  try {
    const provider = await Provider.findById(req.provider._id);
    provider.availability.isAvailable = !provider.availability.isAvailable;
    await provider.save();

    res.status(200).json({
      success: true,
      data: { isAvailable: provider.availability.isAvailable }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get provider bookings
// @route   GET /api/providers/bookings
// @access  Private/Provider
exports.getProviderBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { provider: req.provider._id };
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('service', 'title image')
      .populate('user', 'name phone avatar')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get provider earnings
// @route   GET /api/providers/earnings
// @access  Private/Provider
exports.getEarnings = async (req, res) => {
  try {
    const provider = await Provider.findById(req.provider._id).select('earnings completedJobs');

    const completedBookings = await Booking.find({
      provider: req.provider._id,
      status: 'completed'
    }).select('pricing completedAt');

    // Calculate monthly earnings
    const monthlyEarnings = {};
    completedBookings.forEach(booking => {
      const month = booking.completedAt.toISOString().slice(0, 7);
      monthlyEarnings[month] = (monthlyEarnings[month] || 0) + booking.pricing.totalAmount;
    });

    res.status(200).json({
      success: true,
      data: {
        total: provider.earnings.total,
        pending: provider.earnings.pending,
        completedJobs: provider.completedJobs,
        monthly: monthlyEarnings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve provider (Admin)
// @route   PUT /api/providers/:id/approve
// @access  Private/Admin
exports.approveProvider = async (req, res) => {
  try {
    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    ).select('-password');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.status(200).json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject provider (Admin)
// @route   PUT /api/providers/:id/reject
// @access  Private/Admin
exports.rejectProvider = async (req, res) => {
  try {
    const { reason } = req.body;

    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    ).select('-password');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.status(200).json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pending providers (Admin)
// @route   GET /api/providers/pending
// @access  Private/Admin
exports.getPendingProviders = async (req, res) => {
  try {
    const providers = await Provider.find({ status: 'pending' })
      .select('-password')
      .populate('category', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};