import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import { compressPdf } from "../utils/compressPdf.js";
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
import { getCompaniesById } from "../queries/Companies.js";
import sendEmail from "../utils/sendEmail.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

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
      created_by: userId,
      company_id: req.body.company_id || null
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
    const response = await fetch('https://testflight.tremendous.com/api/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TREMENDOUS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
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
    
    const submission = await getSubmissionById(submission_id);
    
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }
    

    const userResult = await getUsersById(submission.user_id);
    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    const user = userResult[0]; // Use the first element of the array

    const rewardData = {
      name: user.name,
      email: user.email,
      amount: submission.reward_amount
    };
    
    const response = await sendReward(rewardData);

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

// Send invoice email for campaign
// Rate limiting for invoice emails
const invoiceEmailCache = new Map();

export const sendInvoiceEmail = asyncHandler(async (req, res) => {
  
  // Rate limiting - prevent same campaign from sending multiple emails within 30 seconds
  const { campaign_id } = req.body;
  const cacheKey = `campaign_${campaign_id}`;
  const now = Date.now();
  const rateLimitWindow = 30 * 1000; // 30 seconds
  
  if (invoiceEmailCache.has(cacheKey)) {
    const lastSent = invoiceEmailCache.get(cacheKey);
    const timeSinceLastSent = now - lastSent;
    
    if (timeSinceLastSent < rateLimitWindow) {
      const remainingTime = Math.ceil((rateLimitWindow - timeSinceLastSent) / 1000);
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `Please wait ${remainingTime} seconds before sending another invoice for this campaign`,
        retryAfter: remainingTime
      });
    }
  }
  
  // Update cache
  invoiceEmailCache.set(cacheKey, now);
  
  // Clean old entries (older than 1 minute)
  for (const [key, timestamp] of invoiceEmailCache.entries()) {
    if (now - timestamp > 60000) {
      invoiceEmailCache.delete(key);
    }
  }
  
  
  const { 
    recipient_email,
    recipient_name,
    invoice_data,
    pdf_attachment
  } = req.body;

  // Extract data from nested structure
  const campaignId = campaign_id;
  const email = recipient_email;
  const amount = invoice_data?.total_budget;
  const invoiceDate = new Date().toLocaleDateString('en-US');
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US');

  try {
    // Validate required fields
    if (!campaignId || !email || !amount) {
      return res.status(400).json({
        error: "Missing required fields: campaignId, email, amount"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format"
      });
    }

    // Get campaign information
    const campaignResult = await getCampaignById(campaignId);
    
    if (!campaignResult) {
      return res.status(404).json({
        error: "Campaign not found"
      });
    }

    const campaign = campaignResult;

    // Get company information using campaign's company_id
    const companyId = campaign && campaign.company_id ? campaign.company_id : null;
    const companyResult = companyId && companyId > 0 
      ? await getCompaniesById(companyId) 
      : [];
    
    let companyInfo = {
      name: "ADEX Corp.",
      address: "123 Adex Street, Seoul, Korea",
      email: "info@adex.com",
      phone: "+82-2-1234-5678"
    };

    if (companyResult && companyResult.length > 0) {
      const company = companyResult[0];
      companyInfo = {
        name: company.company_name || "ADEX Corp.",
        address: company.address || "123 Adex Street, Seoul, Korea",
        email: company.email || "info@adex.com",
        phone: company.phone || "+82-2-1234-5678"
      };
    }

    // Get client information using campaign's created_by
    const createdBy = campaign && campaign.created_by ? campaign.created_by : null;
    
    const clientResult = createdBy && createdBy > 0 
      ? await getUsersById(createdBy) 
      : [];
    let clientInfo = {
      name: "Client",
      email: email
    };

    if (clientResult && clientResult.length > 0) {
      const client = clientResult[0];
      clientInfo = {
        name: client.name || "Client",
        email: email
      };
    }

    // Prepare campaign name
    const campaignName = campaign && campaign.name ? campaign.name : "Campaign";

    // Prepare invoice data
    const invoiceData = {
      invoiceDate: invoiceDate || new Date().toLocaleDateString('en-US'),
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
      campaignName: campaignName,
      campaignDescription: (campaign && campaign.description) ? campaign.description : "Campaign services",
      amount: parseFloat(amount),
      companyInfo,
      clientInfo
    };

    // Prepare email content
    const hasAttachment = pdf_attachment && pdf_attachment.content;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Invoice for Your Campaign</h2>
        <p>Dear ${clientInfo.name},</p>
        <p>Thank you for using ADEX Connect for your campaign "<strong>${campaignName}</strong>".</p>
        <p>Please find below the invoice details for the services provided. The total amount is <strong>$${parseFloat(amount).toFixed(2)}</strong>.</p>
        ${hasAttachment ? '<p><strong>Please check the attached PDF invoice for detailed information.</strong></p>' : ''}
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Invoice Details:</h3>
          <ul>
            <li><strong>Campaign:</strong> ${campaignName}</li>
            <li><strong>Amount:</strong> $${parseFloat(amount).toFixed(2)}</li>
            <li><strong>Due Date:</strong> ${invoiceData.dueDate}</li>
          </ul>
        </div>
        
        <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Company Information:</h3>
          <p><strong>${companyInfo.name}</strong><br>
          ${companyInfo.address}<br>
          Email: ${companyInfo.email}<br>
          Phone: ${companyInfo.phone}</p>
        </div>
        
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        <p>Best regards,<br>The ADEX Team</p>
      </div>
    `;

    // Prepare attachments
    let attachments = [];
    let pdfSkippedReason = null;
    
    if (pdf_attachment && pdf_attachment.content) {
      try {
        
        // Check base64 size first (before decoding)
        const base64String = pdf_attachment.content.replace(/^data:application\/pdf;base64,/, '');
        const estimatedSizeInBytes = (base64String.length * 3) / 4; // Base64 to binary ratio
        const estimatedSizeInMB = estimatedSizeInBytes / (1024 * 1024);
        
        const pdfBuffer = Buffer.from(base64String, 'base64');
        const actualSizeInMB = pdfBuffer.length / (1024 * 1024);
        
        if (actualSizeInMB > 10) {
          try {
            const compressedBuffer = await compressPdf(pdfBuffer);
            const compressedSizeInMB = compressedBuffer.length / (1024 * 1024);
            
            if (compressedSizeInMB > 10) {
              pdfSkippedReason = `PDF too large even after compression (${compressedSizeInMB.toFixed(2)}MB > 10MB)`;
            } else {
              attachments.push({
                filename: pdf_attachment.filename || `invoice_${campaignId}.pdf`,
                content: compressedBuffer,
                contentType: pdf_attachment.contentType || 'application/pdf'
              });
            }
          } catch (compressionError) {
            pdfSkippedReason = `PDF compression failed: ${compressionError.message}`;
          }
        } else {
          attachments.push({
            filename: pdf_attachment.filename || `invoice_${campaignId}.pdf`,
            content: pdfBuffer,
            contentType: pdf_attachment.contentType || 'application/pdf'
          });
        }
      } catch (error) {
        pdfSkippedReason = `PDF processing error: ${error.message}`;
      }
    }

    // Send email
    await sendEmail(email, "Invoice for Your Campaign", emailContent, null, attachments);
    
    logger.info('Invoice email sent successfully', {
      campaignId,
      email,
      amount
    });

    const response = {
      message: "Invoice email sent successfully",
      data: {
        amount: parseFloat(amount),
        email,
        campaignTitle: campaignName,
        attachmentStatus: attachments.length > 0 ? 'attached' : 'no_attachment'
      }
    };
    
    if (pdfSkippedReason) {
      response.data.pdfSkipped = pdfSkippedReason;
      response.message = "Invoice email sent (PDF attachment skipped due to size limit)";
    }
    
    res.status(200).json(response);

  } catch (error) {
    logger.error('Invoice email sending failed:', error);
    
    res.status(500).json({
      error: "Failed to send invoice email",
      details: error.message
    });
  }
});