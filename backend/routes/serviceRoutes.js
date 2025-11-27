const express = require('express');
const router = express.Router();
const {
  getServices,
  getService,
  getServiceBySlug,
  getCategories,
  getServiceProviders,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Public routes
router.get('/', getServices);
router.get('/categories', getCategories);
router.get('/slug/:slug', getServiceBySlug);
router.get('/:id', getService);
router.get('/:id/providers', getServiceProviders);

// Admin routes
router.use(protect, authorize('admin'));
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

module.exports = router;