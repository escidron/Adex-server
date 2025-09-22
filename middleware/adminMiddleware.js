import asyncHandler from 'express-async-handler';
import { getUsersById } from '../queries/Users.js';
import logger from '../utils/logger.js';

const adminOnly = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user; 
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await getUsersById(userId);

    if (!user || user.length === 0) {
      logger.error(`User not found for admin check: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    if (user[0].user_type === 0) {
      req.adminUser = user[0]; 
      next();
    } else {
      logger.warn(`Unauthorized admin access attempt by user ${userId}`);
      return res.status(403).json({ error: "Admin access required" });
    }
  } catch (error) {
    logger.error(`Admin middleware error: ${error.message}`, { userId: req.user });
    res.status(500).json({ error: "Server error during authorization" });
  }
});

export { adminOnly };