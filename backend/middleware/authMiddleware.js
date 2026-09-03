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

module.exports = { protect };
