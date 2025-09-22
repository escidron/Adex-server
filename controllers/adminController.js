import asyncHandler from 'express-async-handler';
import {
  getAllCampaignsAdmin,
  getCampaignById,
  updateCampaignStatus
} from '../queries/Campaigns.js';
import logger from '../utils/logger.js';

// Get admin dashboard data
export const getAdminDashboard = asyncHandler(async (req, res) => {
  try {
    const campaigns = await getAllCampaignsAdmin();

    // Calculate stats
    const stats = {
      totalCampaigns: campaigns.length,
      pendingCampaigns: campaigns.filter(c => c.status === 'pending').length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      rejectedCampaigns: campaigns.filter(c => c.status === 'rejected').length,
      completedCampaigns: campaigns.filter(c => c.status === 'completed').length
    };

    res.status(200).json({
      message: "Admin dashboard data",
      data: {
        stats,
        recentCampaigns: campaigns.slice(0, 10) // Latest 10 campaigns
      }
    });
  } catch (error) {
    logger.error(`Admin dashboard error: ${error.message}`, { adminId: req.user });
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

// Get all campaigns for admin (with all statuses)
export const getAllCampaignsController = asyncHandler(async (req, res) => {
  try {
    const campaigns = await getAllCampaignsAdmin();

    res.status(200).json({
      message: "All campaigns retrieved successfully",
      data: campaigns
    });
  } catch (error) {
    logger.error(`Admin get all campaigns error: ${error.message}`, { adminId: req.user });
    res.status(500).json({ error: "Failed to retrieve campaigns" });
  }
});

// Get pending campaigns only
export const getPendingCampaigns = asyncHandler(async (req, res) => {
  try {
    const campaigns = await getAllCampaignsAdmin();
    const pendingCampaigns = campaigns.filter(campaign => campaign.status === 'pending');

    res.status(200).json({
      message: "Pending campaigns retrieved successfully",
      data: pendingCampaigns
    });
  } catch (error) {
    logger.error(`Admin get pending campaigns error: ${error.message}`, { adminId: req.user });
    res.status(500).json({ error: "Failed to retrieve pending campaigns" });
  }
});

// Update campaign status
export const updateCampaignStatusAdmin = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'active', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be one of: " + validStatuses.join(', ')
      });
    }

    // Check if campaign exists
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Update campaign status
    await updateCampaignStatus(id, status);

    logger.info(`Campaign ${id} status updated to ${status} by admin ${req.user}`);

    res.status(200).json({
      message: `Campaign status updated to ${status} successfully`,
      data: { campaignId: id, newStatus: status }
    });
  } catch (error) {
    logger.error(`Admin update campaign status error: ${error.message}`, {
      adminId: req.user,
      campaignId: req.params.id,
      status: req.body.status
    });
    res.status(500).json({ error: "Failed to update campaign status" });
  }
});