const User = require('../models/User');
const Provider = require('../models/Provider');
const { validationResult } = require('express-validator');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, phone, address, location } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
      location: location ? {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      } : undefined
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register provider
// @route   POST /api/auth/register-provider
// @access  Public
exports.registerProvider = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, phone, category, experience, serviceArea } = req.body;

    const existingProvider = await Provider.findOne({ email });
    if (existingProvider) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const provider = await Provider.create({
      name,
      email,
      password,
      phone,
      category,
      experience,
      serviceArea
    });

    sendTokenResponse(provider, 201, res, 'provider');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login provider
// @route   POST /api/auth/login-provider
// @access  Public
exports.loginProvider = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const provider = await Provider.findOne({ email }).select('+password');

    if (!provider) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await provider.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(provider, 200, res, 'provider');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = req.userType === 'provider' 
      ? await Provider.findById(req.user._id).populate('category services')
      : await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user,
      userType: req.userType
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res, type = 'user') => {
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    userType: type,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...(type === 'provider' && { status: user.status })
    }
  });
};