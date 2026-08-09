const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'agrifinance-dev-secret-change-in-production';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload; // { id, role, email, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, farmName: user.farmName, currency: user.currency },
    SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { requireAuth, requireAdmin, signToken, SECRET };
