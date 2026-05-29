// Middleware to check if user has required role
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Access denied. You do not have permission to perform this action.' 
      });
    }

    next();
  };
};

module.exports = { checkRole };
