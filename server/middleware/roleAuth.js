// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `This action requires one of these roles: ${roles.join(', ')}`,
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

module.exports = authorize;