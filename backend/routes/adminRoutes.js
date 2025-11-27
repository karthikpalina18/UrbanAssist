const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getRecentActivities,
  getProvidersList,
  approveProvider,
  rejectProvider
} = require("../controllers/adminController");

const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");

// All admin routes must be protected + role validated
router.use(protect, authorize("admin"));

// Dashboard statistics
router.get("/dashboard-stats", getDashboardStats);

// Admin activities feed (recent bookings, providers, etc.)
router.get("/activities", getRecentActivities);

// Get providers with pagination + search
router.get("/providers", getProvidersList);

// Approve / Reject provider
router.put("/providers/:id/approve", approveProvider);
router.put("/providers/:id/reject", rejectProvider);

module.exports = router;
