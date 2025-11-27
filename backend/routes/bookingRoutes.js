const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBooking,
  getBookings,
  confirmBooking,
  startService,
  completeBooking,
  cancelBooking,
  getPriceEstimate,
  regenerateOTP,
  getBookingStats
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const Booking = require("../models/Booking");


// Public route for price estimate
router.post('/estimate', getPriceEstimate);

router.get("/user", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate("service", "title image pricing")
      .populate("provider", "name rating experience")
      .sort({ createdAt: -1 });

    // Convert DB statuses to UI statuses 😎
    const formatted = bookings.map(b => ({
      id: b._id,
      service: b.service?.title || "Service",
      provider: b.provider?.name || "Not Assigned",
      price: b.pricing.totalAmount,
      date: new Date(b.schedule.date).toLocaleDateString(),
      time: `${b.schedule.timeSlot.start} - ${b.schedule.timeSlot.end}`,
      location: b.location.address,

      // UI-Friendly Status Mapping:
      status:
        b.status === "pending" || b.status === "confirmed" || b.status === "in_progress"
          ? "upcoming"
          : b.status === "completed"
          ? "completed"
          : "cancelled",

      rating: b.rating ? true : null
    }));

    res.json({
      success: true,
      bookings: formatted,
    });
  } catch (error) {
    console.error("Booking fetch error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Protected routes
router.use(protect);

router.post('/', createBooking);
router.get('/stats', authorize('admin'), getBookingStats);
router.get('/', authorize('admin'), getBookings);

router.route('/:id')
  .get(getBooking);

router.put('/:id/confirm', authorize('provider'), confirmBooking);
router.put('/:id/start', authorize('provider'), startService);
router.put('/:id/complete', authorize('provider'), completeBooking);
router.put('/:id/cancel', cancelBooking);
router.put('/:id/regenerate-otp', regenerateOTP);

module.exports = router;