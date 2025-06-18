import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import {
  getAllCampaigns,
  getCampaignById,
  createCampaignQuery,
  updateCampaign,
  deleteCampaign,
  getCampaignParticipants,
  submitCampaignParticipation,
  updateSubmissionCheckStatus,
  updateSubmissionRewardStatus,
  getUserCampaigns,
  getSubmissionById,
  removeParticipantFromCampaign
} from "../queries/Campaigns.js";
import { getUsersById } from "../queries/Users.js";

// Get all campaigns
export const getCampaigns = asyncHandler(async (req, res) => {
  try {
    let userId = null;
    if (req.cookies.jwt) {
      const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);
      userId = decoded.userId;
    }
    
    const campaigns = await getAllCampaigns(userId);
    res.status(200).json({ data: campaigns });
  } catch (error) {
    logger.error(error.message, { endpoint: "getCampaigns" });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get campaign details
export const getCampaignDetail = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await getCampaignById(id);
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    const participants = await getCampaignParticipants(id);
    const participant_count = participants.length;
    const participant_limit = campaign.max_participants;

    res.status(200).json({
      data: {
        ...campaign,
        participant_count,
        participant_limit
      }
    });
  } catch (error) {
    logger.error(error.message, { endpoint: "getCampaignDetail", campaignId: req.params.id });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new campaign
export const createCampaign = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const campaignData = {
      ...req.body,
      created_by: userId
    };
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'start_date', 'end_date', 'max_participants', 'budget', 'reward_amount'];
    const missingFields = requiredFields.filter(field => !campaignData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        fields: missingFields 
      });
    }
    
    const result = await createCampaignQuery(campaignData);
    
    if (!result || !result.id) {
      return res.status(500).json({ error: "Failed to create campaign. Database error." });
    }
    
    res.status(201).json({
      message: "Campaign created successfully",
      data: { id: result.id }
    });
  } catch (error) {
    console.error("Create campaign error:", error);
    logger.error(error.message, { endpoint: "createCampaign" });
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Update campaign info
export const updateCampaignInfo = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const campaignData = req.body;
    
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    await updateCampaign(id, campaignData);
    
    res.status(200).json({ message: "Campaign updated successfully" });
  } catch (error) {
    logger.error(error.message, { endpoint: "updateCampaignInfo", campaignId: req.params.id });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete campaign
export const deleteCampaignById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    if (campaign.created_by !== userId) {
      return res.status(403).json({ error: "Only the creator can delete this campaign." });
    }
    await deleteCampaign(id);
    res.status(200).json({ message: "Campaign deleted successfully" });
  } catch (error) {
    logger.error(error.message, { endpoint: "deleteCampaignById", campaignId: req.params.id });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get campaign participants
export const getParticipants = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const participants = await getCampaignParticipants(id);
    
    res.status(200).json({ data: participants });
  } catch (error) {
    logger.error(error.message, { endpoint: "getParticipants", campaignId: req.params.id });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit campaign participation
export const submitParticipation = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const submissionData = {
      ...req.body,
      user_id: userId
    };
    
    const campaign = await getCampaignById(submissionData.campaign_id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    await submitCampaignParticipation(submissionData);
    
    res.status(201).json({ message: "Participation submitted successfully" });
  } catch (error) {
    logger.error(error.message, { endpoint: "submitParticipation" });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check submission
export const checkSubmission = asyncHandler(async (req, res) => {
  const { submission_id } = req.params;
  const { is_checked, note } = req.body;

  try {
    const result = await updateSubmissionCheckStatus(submission_id, is_checked, note);

    if (!result) {
      return res.status(404).json({
        message: "Submission not found"
      });
    }

    res.status(200).json({
      message: "Submission check status updated successfully"
    });
  } catch (error) {
    logger.error(error.message, { endpoint: "checkSubmission", submission_id });
    res.status(500).json({
      message: "Failed to update submission check status",
      error: error.message
    });
  }
});

// Send reward using Tremendous API
const sendReward = async (rewardData) => {
  try {
    console.log('Sending reward to:', rewardData);
    console.log('Amount:', rewardData.amount);
    console.log('API Key:', process.env.TREMENDOUS_API_KEY ? 'Present' : 'Missing');
    console.log('Campaign ID:', process.env.TREMENDOUS_CAMPAIGN_ID);
    console.log('Funding Source ID:', process.env.TREMENDOUS_FUNDING_SOURCE_ID);
    
    const payload = {
      payment: {
        funding_source_id: process.env.TREMENDOUS_FUNDING_SOURCE_ID
      },
      rewards: [
        {
          value: {
            denomination: parseFloat(rewardData.amount),
            currency_code: "USD"
          },
          recipient: {
            name: rewardData.name,
            email: rewardData.email
          },
          delivery: {
            method: "EMAIL"
          },
          products: [
            "Q24BD9EZ332JT",
            "TKIHHHAJU20C",
            "KV934TZ93NQM",
            "ET0ZVETV5ILN",
            "OKMHM2X2OHYV"
          ]
        }
      ],
      campaign_id: process.env.TREMENDOUS_CAMPAIGN_ID
    };
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('https://testflight.tremendous.com/api/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TREMENDOUS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Tremendous API Response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || data.message || 'Unknown error from Tremendous API');
    }

    return {
      success: true,
      order_id: data.order?.id || data.id,
      status: data.order?.status || data.status || 'created'
    };
  } catch (error) {
    console.error("Tremendous API Error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update reward status
export const updateRewardStatus = asyncHandler(async (req, res) => {
  try {
    const { submission_id } = req.params;
    console.log('Processing reward for submission ID:', submission_id);
    
    const submission = await getSubmissionById(submission_id);
    
    if (!submission) {
      console.log('Submission not found:', submission_id);
      return res.status(404).json({ success: false, message: "Submission not found" });
    }
    
    console.log('Submission found:', submission);

    const userResult = await getUsersById(submission.user_id);
    if (!userResult || userResult.length === 0) {
      console.log('User not found:', submission.user_id);
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    const user = userResult[0]; // Use the first element of the array
    console.log('User found:', {
      id: user.id,
      name: user.name,
      email: user.email
    });

    const rewardData = {
      name: user.name,
      email: user.email,
      amount: submission.reward_amount
    };
    
    const response = await sendReward(rewardData);
    console.log('Reward response:', response);

    if (response.success) {
      await updateSubmissionRewardStatus(submission_id, true);
      return res.json({ 
        success: true, 
        message: "Reward sent successfully",
        order_id: response.order_id,
        status: response.status
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: `Failed to send reward: ${response.error || 'Unknown error'}`
      });
    }
  } catch (error) {
    console.error("Error in updateRewardStatus:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error: " + error.message
    });
  }
});

// Remove participant from campaign
export const removeParticipant = asyncHandler(async (req, res) => {
  const { campaign_id, submission_id } = req.params;

  try {
    const result = await removeParticipantFromCampaign(submission_id);
    
    if (!result) {
      return res.status(404).json({
        message: "Submission not found or already removed"
      });
    }

    res.status(200).json({
      message: "Participation removed successfully"
    });
  } catch (error) {
    logger.error(error.message, { endpoint: "removeParticipant", campaign_id, submission_id });
    res.status(500).json({
      message: "Failed to remove participation",
      error: error.message
    });
  }
});

// Get my participations
export const getMyParticipations = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const campaigns = await getUserCampaigns(userId);
    
    res.status(200).json({ data: campaigns });
  } catch (error) {
    logger.error(error.message, { endpoint: "getMyParticipations" });
    res.status(500).json({ error: "Internal server error" });
  }
}); 