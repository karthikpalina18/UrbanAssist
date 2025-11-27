const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const Notification = require('../models/Notification');
const { calculateFare } = require('../utils/calculateFare');
const { getDistance } = require('../utils/googleApiRequest');

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    const { serviceId, providerId, location, schedule, notes, paymentMethod } = req.body;

    // Validate service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Validate provider
    const provider = await Provider.findById(providerId);
    if (!provider || provider.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Provider not found or not available'
      });
    }

    // Calculate distance and pricing
    const distanceData = await getDistance(
      { lat: location.coordinates[1], lng: location.coordinates[0] },
      { 
        lat: provider.currentLocation.coordinates[1], 
        lng: provider.currentLocation.coordinates[0] 
      }
    );

    const pricing = calculateFare(service.basePrice, distanceData.distance.value / 1000);

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const booking = await Booking.create({
      user: req.user._id,
      provider: providerId,
      service: serviceId,
      location: {
        address: location.address,
        coordinates: {
          type: 'Point',
          coordinates: location.coordinates
        },
        landmark: location.landmark
      },
      schedule: {
        date: new Date(schedule.date),
        timeSlot: schedule.timeSlot
      },
      pricing,
      distance: {
        value: distanceData.distance.value / 1000,
        text: distanceData.distance.text
      },
      duration: {
        estimated: distanceData.duration.value / 60
      },
      payment: {
        method: paymentMethod || 'cash'
      },
      otp: {
        code: otp,
        expiresAt: otpExpiry
      },
      notes
    });

    await booking.populate([
      { path: 'service', select: 'title image category' },
      { path: 'provider', select: 'name phone avatar' }
    ]);

    // Create notification for provider
    await Notification.create({
      recipient: providerId,
      recipientModel: 'Provider',
      type: 'booking_created',
      title: 'New Booking Request',
      message: `You have a new booking for ${service.title}`,
      data: { bookingId: booking._id }
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`provider_${providerId}`).emit('new-booking', booking);

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('service', 'title image category basePrice')
      .populate('provider', 'name phone avatar rating currentLocation')
      .populate('user', 'name phone avatar');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check ownership
    const isOwner = booking.user._id.toString() === req.user._id.toString();
    const isProvider = req.userType === 'provider' && 
                       booking.provider._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all bookings (Admin)
// @route   GET /api/bookings
// @access  Private/Admin
exports.getBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('service', 'title category')
      .populate('provider', 'name phone')
      .populate('user', 'name phone')
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

// @desc    Confirm booking (Provider)
// @route   PUT /api/bookings/:id/confirm
// @access  Private/Provider
exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.provider.toString() !== req.provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm booking with status: ${booking.status}`
      });
    }

    booking.status = 'confirmed';
    await booking.save();

    // Notify user
    await Notification.create({
      recipient: booking.user,
      recipientModel: 'User',
      type: 'booking_confirmed',
      title: 'Booking Confirmed',
      message: 'Your booking has been confirmed by the provider',
      data: { bookingId: booking._id }
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user_${booking.user}`).emit('booking-confirmed', booking);

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Start service (Provider)
// @route   PUT /api/bookings/:id/start
// @access  Private/Provider
exports.startService = async (req, res) => {
  try {
    const { otp } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.provider.toString() !== req.provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Booking must be confirmed first'
      });
    }

    // Verify OTP
    if (booking.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (new Date() > booking.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    booking.status = 'in_progress';
    booking.otp.verified = true;
    await booking.save();

    // Notify user
    const io = req.app.get('io');
    io.to(`user_${booking.user}`).emit('service-started', booking);

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Complete booking (Provider)
// @route   PUT /api/bookings/:id/complete
// @access  Private/Provider
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.provider.toString() !== req.provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (booking.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Service must be in progress'
      });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.payment.status = 'paid';
    booking.payment.paidAt = new Date();
    await booking.save();

    // Update provider stats
    await Provider.findByIdAndUpdate(req.provider._id, {
      $inc: {
        completedJobs: 1,
        'earnings.total': booking.pricing.totalAmount,
        'earnings.pending': booking.pricing.totalAmount
      }
    });

    // Notify user
    await Notification.create({
      recipient: booking.user,
      recipientModel: 'User',
      type: 'booking_completed',
      title: 'Service Completed',
      message: 'Your service has been completed. Please rate your experience.',
      data: { bookingId: booking._id }
    });

    const io = req.app.get('io');
    io.to(`user_${booking.user}`).emit('booking-completed', booking);

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const isUser = booking.user.toString() === req.user._id.toString();
    const isProvider = req.userType === 'provider' && 
                       booking.provider.toString() === req.user._id.toString();

    if (!isUser && !isProvider) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (['completed', 'cancelled', 'refunded'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status: ${booking.status}`
      });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      reason: reason || 'No reason provided',
      cancelledBy: isProvider ? 'provider' : 'user',
      cancelledAt: new Date()
    };
    await booking.save();

    // Notify the other party
    const recipientId = isProvider ? booking.user : booking.provider;
    const recipientModel = isProvider ? 'User' : 'Provider';

    await Notification.create({
      recipient: recipientId,
      recipientModel,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `Booking has been cancelled. Reason: ${reason || 'No reason provided'}`,
      data: { bookingId: booking._id }
    });

    const io = req.app.get('io');
    io.to(`${recipientModel.toLowerCase()}_${recipientId}`).emit('booking-cancelled', booking);

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get price estimate
// @route   POST /api/bookings/estimate
// @access  Public
exports.getPriceEstimate = async (req, res) => {
  try {
    const { serviceId, userLocation, providerLocation } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    let distanceKm = 0;
    let duration = 0;

    if (userLocation && providerLocation) {
      const distanceData = await getDistance(userLocation, providerLocation);
      distanceKm = distanceData.distance.value / 1000;
      duration = distanceData.duration.value / 60;
    }

    const pricing = calculateFare(service.basePrice, distanceKm);

    res.status(200).json({
      success: true,
      data: {
        service: {
          id: service._id,
          title: service.title,
          basePrice: service.basePrice
        },
        distance: {
          value: distanceKm,
          text: `${distanceKm.toFixed(1)} km`
        },
        duration: {
          value: duration,
          text: `${Math.round(duration)} mins`
        },
        pricing
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Regenerate OTP
// @route   PUT /api/bookings/:id/regenerate-otp
// @access  Private
exports.regenerateOTP = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

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

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    booking.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      verified: false
    };
    await booking.save();

    res.status(200).json({
      success: true,
      data: { otp: booking.otp.code, expiresAt: booking.otp.expiresAt }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get booking stats (Admin)
// @route   GET /api/bookings/stats
// @access  Private/Admin
exports.getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBookings = await Booking.countDocuments({
      createdAt: { $gte: today }
    });

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: monthStart }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        todayBookings,
        monthlyRevenue: monthlyRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};