const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Provider = require('../models/Provider');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'provider') {
      req.provider = await Provider.findById(decoded.id);
      req.user = req.provider;
      req.userType = 'provider';
    } else {
      req.user = await User.findById(decoded.id);
      req.userType = 'user';
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

exports.optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.role === 'provider') {
        req.provider = await Provider.findById(decoded.id);
        req.user = req.provider;
        req.userType = 'provider';
      } else {
        req.user = await User.findById(decoded.id);
        req.userType = 'user';
      }
    } catch (error) {
      // Token invalid, continue without user
    }
  }

  next();
};