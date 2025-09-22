import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import {
  getAdminDashboard,
  getAllCampaignsController,
  getPendingCampaigns,
  updateCampaignStatusAdmin
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(protect, adminOnly);

// Admin dashboard - main entry point
router.get('/dashboard', getAdminDashboard);

// Campaign management routes
router.get('/campaigns', getAllCampaignsController);
router.get('/campaigns/pending', getPendingCampaigns);
router.put('/campaigns/:id/status', updateCampaignStatusAdmin);

export default router;