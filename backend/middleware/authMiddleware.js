const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authorization.slice(7).trim();

  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({ message: 'Invalid authentication token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (typeof decoded !== 'object' || !decoded.id) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('role isActive');

    if (!user || user.isActive === false) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Require admin error:', error);
    return res.status(500).json({ message: 'Server error while checking admin access' });
  }
};

module.exports = { protect, requireAdmin };
