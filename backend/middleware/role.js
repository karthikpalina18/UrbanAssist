exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

exports.isProviderApproved = async (req, res, next) => {
  if (req.userType === 'provider' && req.provider.status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Your account is pending approval'
    });
  }
  next();
};