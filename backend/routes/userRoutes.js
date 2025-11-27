const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateProfile,
  updateLocation,
  getUserBookings,
  deactivateUser
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', authorize('admin'), getUsers);
router.get('/bookings', getUserBookings);
router.put('/profile', updateProfile);
router.put('/location', updateLocation);

router.route('/:id')
  .get(authorize('admin'), getUser);

router.put('/:id/deactivate', authorize('admin'), deactivateUser);

module.exports = router;