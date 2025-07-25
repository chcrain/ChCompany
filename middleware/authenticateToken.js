// middleware/authenticateToken.js

const jwt = require('jsonwebtoken');

/**
 * This middleware checks for a valid JWT in the Authorization header.
 * Example: Authorization: Bearer <token>
 * If valid, attaches decoded token data to req.user and calls next().
 * Otherwise, returns 401 or 403.
 */

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ result: 'error', message: 'No auth header provided.' });
  }

  const token = authHeader.split(' ')[1]; // Expect "Bearer <token>"
  if (!token) {
    return res.status(401).json({ result: 'error', message: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Uses the JWT_SECRET from .env
    req.user = decoded;  // If you need user data
    next();
  } catch (err) {
    return res.status(403).json({ result: 'error', message: 'Invalid token.' });
  }
};
