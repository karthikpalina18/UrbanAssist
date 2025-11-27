const User = require("../models/User");
const Provider = require("../models/Provider");
const Booking = require("../models/Booking");

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalProviders = await Provider.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    const totalRevenue = await Booking.aggregate([
      { $match: { "payment.status": "paid" } },
      { $group: { _id: null, revenue: { $sum: "$pricing.totalAmount" } } }
    ]);

    res.json({
      totalUsers,
      totalProviders,
      totalBookings,
      totalRevenue: totalRevenue[0]?.revenue || 0
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};

// Recent Activities (Last 10)
exports.getRecentActivities = async (req, res) => {
  try {
    const recentBookings = await Booking.find()
      .populate("user", "name email")
      .populate("provider", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ activities: recentBookings });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch recent activities" });
  }
};

// Provider List for pagination + search
exports.getProvidersList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = {
      name: { $regex: search, $options: "i" }
    };

    const providers = await Provider.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalProviders = await Provider.countDocuments(query);

    res.json({
      providers,
      totalPages: Math.ceil(totalProviders / limit)
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch providers" });
  }
};

// Approve Provider
exports.approveProvider = async (req, res) => {
  try {
    await Provider.findByIdAndUpdate(req.params.id, { status: "approved" });
    res.json({ message: "Provider approved" });
  } catch {
    res.status(500).json({ message: "Failed to approve provider" });
  }
};

// Reject Provider
exports.rejectProvider = async (req, res) => {
  try {
    await Provider.findByIdAndUpdate(req.params.id, { status: "rejected" });
    res.json({ message: "Provider rejected" });
  } catch {
    res.status(500).json({ message: "Failed to reject provider" });
  }
};
