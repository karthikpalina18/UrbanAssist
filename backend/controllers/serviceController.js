const Service = require('../models/Service');
const Provider = require('../models/Provider');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
exports.getServices = async (req, res) => {
  try {
    const { category, active, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const services = await Service.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ popularity: -1 });

    const total = await Service.countDocuments(query);

    res.status(200).json({
      success: true,
      count: services.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: services
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public
exports.getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Increment popularity
    service.popularity += 1;
    await service.save();

    res.status(200).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get service by slug
// @route   GET /api/services/slug/:slug
// @access  Public
exports.getServiceBySlug = async (req, res) => {
  try {
    const service = await Service.findOne({ slug: req.params.slug });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get service categories
// @route   GET /api/services/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Service.distinct('category');
    
    const categoryData = await Promise.all(
      categories.map(async (cat) => {
        const count = await Service.countDocuments({ category: cat, isActive: true });
        const providerCount = await Provider.countDocuments({ 
          category: { $in: await Service.find({ category: cat }).select('_id') },
          status: 'approved'
        });
        return { name: cat, serviceCount: count, providerCount };
      })
    );

    res.status(200).json({
      success: true,
      data: categoryData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get providers for a service
// @route   GET /api/services/:id/providers
// @access  Public
exports.getServiceProviders = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    let query = {
      category: req.params.id,
      status: 'approved',
      'availability.isAvailable': true
    };

    if (lat && lng) {
      query.currentLocation = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius) * 1000
        }
      };
    }

    const providers = await Provider.find(query)
      .select('name avatar rating experience completedJobs currentLocation')
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

// @desc    Create service (Admin)
// @route   POST /api/services
// @access  Private/Admin
exports.createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update service (Admin)
// @route   PUT /api/services/:id
// @access  Private/Admin
exports.updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete service (Admin)
// @route   DELETE /api/services/:id
// @access  Private/Admin
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};