// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Hard auth — token nahi hai toh 401
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    // For GET /videos — allow unauthenticated but don't block
    // (videoRoutes uses protect but videoController handles req.user being null)
    req.user = null;
    return next();
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    return next();
  } catch {
    req.user = null;
    return next();
  }
};

// Hard auth — definitely need a logged-in user
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User not found." });
    return next();
  } catch {
    return res.status(401).json({ message: "Token invalid or expired." });
  }
};

// Admin only — must come after protect/requireAuth
export const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ message: "Access denied. Admins only." });
};
