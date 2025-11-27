const express = require('express');
const router = express.Router();
const {
  getProviders,
  getProvider,
  getNearbyProviders,
  getRecommendedProvider,
  updateProfile,
  updateLocation,
  toggleAvailability,
  getProviderBookings,
  getEarnings,
  approveProvider,
  rejectProvider,
  getPendingProviders
} = require('../controllers/providerController');
const { protect } = require('../middleware/auth');
const { authorize, isProviderApproved } = require('../middleware/role');

// Public routes
router.get('/', getProviders);
router.get('/nearby', getNearbyProviders);
router.get('/:id', getProvider);

// Protected routes
router.use(protect);

router.post('/recommend', getRecommendedProvider);

// Provider-only routes
router.put('/profile', authorize('provider'), updateProfile);
router.put('/location', authorize('provider'), updateLocation);
router.put('/availability', authorize('provider'), isProviderApproved, toggleAvailability);
router.get('/my/bookings', authorize('provider'), getProviderBookings);
router.get('/my/earnings', authorize('provider'), getEarnings);

// Admin routes
router.get('/admin/pending', authorize('admin'), getPendingProviders);
router.put('/:id/approve', authorize('admin'), approveProvider);
router.put('/:id/reject', authorize('admin'), rejectProvider);

module.exports = router;