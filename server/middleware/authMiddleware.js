import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  // ✅ Print incoming headers for debugging
  console.log("🔍 Incoming Headers:", req.headers);

  const authHeader = req.header('Authorization');

  // Check if token is missing
  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  // Remove 'Bearer ' prefix
  const token = authHeader.replace('Bearer ', '').trim();

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;      // Attach decoded user info
    next();                  // Continue to controller
  } catch (error) {
    return res.status(400).json({ message: 'Invalid token.' });
  }
};
