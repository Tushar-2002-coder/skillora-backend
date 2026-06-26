import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verifies the JWT token sent by the frontend and attaches the user to req.user
export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found, authorization denied." });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Token invalid or expired. Please log in again." });
    }
  }

  return res.status(401).json({ message: "No token provided, authorization denied." });
};

// Only allows admins through. Must be used AFTER `protect`.
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Admins only." });
};
