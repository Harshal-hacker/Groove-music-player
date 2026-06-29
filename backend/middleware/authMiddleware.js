const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // 🛡️ DUAL-AUTH FIX: 
  // Looks for a Web Cookie FIRST. If missing, it checks for a Mobile App Header!
  let token = req.cookies?.auth_token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Access Denied. No token provided." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    if (res.clearCookie) res.clearCookie('auth_token');
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = { verifyToken };