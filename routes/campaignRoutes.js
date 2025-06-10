import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getCampaigns,
  getCampaignDetail,
  createCampaign,
  updateCampaignInfo,
  deleteCampaignById,
  getParticipants,
  submitParticipation,
  checkSubmission,
  updateRewardStatus,
  getMyParticipations,
  removeParticipant
} from '../controllers/campaignController.js';

const router = express.Router();

// Campaign CRUD operations
router.get("/", getCampaigns);
router.get("/:id", getCampaignDetail);
router.post("/", protect, createCampaign);
router.put("/:id", protect, updateCampaignInfo);
router.delete("/:id", protect, deleteCampaignById);

// Campaign participation
router.get('/:id/participants', getParticipants);
router.post('/participate', protect, submitParticipation);
router.put('/submissions/:submission_id/check', protect, checkSubmission);
router.put('/submissions/:submission_id/reward', protect, updateRewardStatus);
router.get('/my/participations', protect, getMyParticipations);
router.delete('/:campaign_id/submissions/:submission_id', protect, removeParticipant);

export default router; 