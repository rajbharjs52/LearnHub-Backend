// middleware/roleMiddleware.js
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ msg: 'Role required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    next();
  };
};

module.exports = roleMiddleware;