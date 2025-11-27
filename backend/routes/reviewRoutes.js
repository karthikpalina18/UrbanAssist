const express = require('express');
const router = express.Router();
const {
  createReview,
  getProviderReviews,
  getReview,
  updateReview,
  deleteReview,
  replyToReview,
  markHelpful
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Public routes
router.get('/provider/:providerId', getProviderReviews);
router.get('/:id', getReview);

// Protected routes
router.use(protect);

router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.put('/:id/helpful', markHelpful);

// Provider routes
router.put('/:id/reply', authorize('provider'), replyToReview);

module.exports = router;