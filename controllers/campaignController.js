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
  removeParticipantFromCampaign,
  getMyCampaigns,
  getParticipatedCampaigns,
  updateSubmissionUrl
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

// Submit campaign participation (registration only)
export const submitParticipation = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const submissionData = {
      campaign_id: req.body.campaign_id,
      user_id: userId,
      sns_url: req.body.sns_url || null  // Allow empty/null sns_url
    };
    
    const campaign = await getCampaignById(submissionData.campaign_id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    // Check if campaign is still active
    const now = new Date();
    const endDate = new Date(campaign.end_date);
    if (now > endDate) {
      return res.status(400).json({ error: "Campaign has ended" });
    }
    
    const result = await submitCampaignParticipation(submissionData);
    
    res.status(201).json({ 
      success: true,
      participation_id: result.insertId,
      message: submissionData.sns_url ? 
        "Successfully participated in campaign with URL" : 
        "Successfully registered for campaign. You can submit your URL later."
    });
  } catch (error) {
    if (error.message === 'User already registered for this campaign') {
      return res.status(409).json({ error: error.message });
    }
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

    // Prepare attachments
    let attachments = [];
    
    if (pdf_attachment && pdf_attachment.content) {
      try {
        const base64String = pdf_attachment.content.replace(/^data:application\/pdf;base64,/, '');
        const pdfBuffer = Buffer.from(base64String, 'base64');
        const actualSizeInMB = pdfBuffer.length / (1024 * 1024);
        
        // Only attach if under 10MB (silently skip if over)
        if (actualSizeInMB <= 10) {
          attachments.push({
            filename: pdf_attachment.filename || `invoice_${campaignId}.pdf`,
            content: pdfBuffer,
            contentType: pdf_attachment.contentType || 'application/pdf'
          });
        }
      } catch (error) {
        // Silently skip on error
      }
    }

    // Prepare minimal black & white email content (after attachments are processed)
    const hasAttachment = attachments.length > 0;
    const emailContent = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #000000;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 20px 20px 20px; border-bottom: 2px solid #000000;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #000000; letter-spacing: 1px;">
            CAMPAIGN INVOICE
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; font-weight: bold; color: #000000;">
            ${companyInfo.name}
          </p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #000000;">
            Invoice Date: ${invoiceData.invoiceDate}
          </p>
        </div>

        <!-- Main content -->
        <div style="padding: 30px 20px; background: #ffffff;">
          
          <!-- Campaign Details Section -->
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #000000; letter-spacing: 0.5px;">
              CAMPAIGN DETAILS
            </h2>
            <div style="border-bottom: 1px solid #000000; margin-bottom: 15px;"></div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #000000; font-size: 14px;">Campaign Name:</td>
                <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: bold; text-align: right;">${campaignName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #000000; font-size: 14px;">Service Description:</td>
                <td style="padding: 8px 0; color: #000000; font-size: 14px; text-align: right;">${invoiceData.campaignDescription}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #000000; font-size: 14px;">Due Date:</td>
                <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: bold; text-align: right;">${invoiceData.dueDate}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Details Section -->
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #000000; letter-spacing: 0.5px;">
              PAYMENT DETAILS
            </h2>
            <div style="border-bottom: 1px solid #000000; margin-bottom: 15px;"></div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #000000; font-size: 14px;">Campaign Service:</td>
                <td style="padding: 8px 0; color: #000000; font-size: 14px; text-align: right;">$${parseFloat(amount).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 15px 0 8px 0;">
                  <div style="border-bottom: 1px solid #000000;"></div>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #000000; font-size: 16px; font-weight: bold;">TOTAL AMOUNT:</td>
                <td style="padding: 8px 0; color: #000000; font-size: 16px; font-weight: bold; text-align: right;">$${parseFloat(amount).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Banking Information Section -->
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #000000; letter-spacing: 0.5px;">
              BANKING INFORMATION
            </h2>
            <div style="border-bottom: 1px solid #000000; margin-bottom: 15px;"></div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #000000; font-size: 14px;">Bank Name:</td>
                <td style="padding: 8px 0; color: #000000; font-size: 14px; text-align: right;">Truist Bank</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #000000; font-size: 14px;">Address:</td>
                <td style="padding: 8px 0; color: #000000; font-size: 14px; text-align: right;">7681 Linton Hall Rd, Gainesville, VA 20155</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #000000; font-size: 14px;">Routing Number:</td>
                <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: bold; text-align: right;">051404260</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #000000; font-size: 14px;">Account Number:</td>
                <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: bold; text-align: right;">1470002991527</td>
              </tr>
            </table>
          </div>

          ${hasAttachment ? `
          <!-- Attachment Notice -->
          <div style="border: 1px solid #000000; padding: 15px; margin-bottom: 30px; text-align: center;">
            <p style="margin: 0; color: #000000; font-size: 14px;">
              <strong>Detailed PDF invoice is attached to this email</strong>
            </p>
          </div>
          ` : ''}

          <!-- Company Information Section -->
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #000000; letter-spacing: 0.5px;">
              COMPANY INFORMATION
            </h2>
            <div style="border-bottom: 1px solid #000000; margin-bottom: 15px;"></div>
            
            <div style="color: #000000; font-size: 14px; line-height: 1.6;">
              <strong>${companyInfo.name}</strong><br>
              ${companyInfo.address}<br>
              Email: ${companyInfo.email}<br>
              Phone: ${companyInfo.phone}
            </div>
          </div>

          <!-- Footer message -->
          <div style="border-top: 1px solid #000000; padding-top: 20px; text-align: center;">
            <p style="color: #000000; font-size: 14px; line-height: 1.5; margin: 0 0 15px 0;">
              Please transfer the total amount to complete your campaign registration.
            </p>
            <p style="color: #000000; font-size: 14px; margin: 0;">
              <strong>Contact: info@adexconnect.com | (555) 703-2339</strong>
            </p>
          </div>
        </div>
      </div>
    `;

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
    
    res.status(200).json(response);

  } catch (error) {
    logger.error('Invoice email sending failed:', error);
    
    res.status(500).json({
      error: "Failed to send invoice email",
      details: error.message
    });
  }
});

// Get my created campaigns
export const getMyCampaignsHandler = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const campaigns = await getMyCampaigns(userId);
    
    res.status(200).json({ data: campaigns });
  } catch (error) {
    logger.error(error.message, { endpoint: "getMyCampaigns" });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get campaigns I participated in
export const getParticipatedHandler = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const participations = await getParticipatedCampaigns(userId);
    
    res.status(200).json({ data: participations });
  } catch (error) {
    logger.error(error.message, { endpoint: "getParticipatedCampaigns" });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update SNS URL for existing submission
export const updateSubmissionUrlHandler = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const { submission_id } = req.params;
    const { sns_url } = req.body;
    
    // Validate sns_url
    if (!sns_url || sns_url.trim() === '') {
      return res.status(400).json({ error: "SNS URL is required" });
    }
    
    // Basic URL validation
    const urlPattern = /^https?:\/\/(www\.)?(instagram\.com|twitter\.com|x\.com|facebook\.com|youtube\.com|tiktok\.com|linkedin\.com)/i;
    if (!urlPattern.test(sns_url)) {
      return res.status(400).json({ 
        error: "Please provide a valid social media URL (Instagram, Twitter/X, Facebook, YouTube, TikTok, or LinkedIn)" 
      });
    }
    
    const result = await updateSubmissionUrl(submission_id, userId, sns_url.trim());
    
    res.status(200).json({
      success: true,
      message: "SNS URL updated successfully",
      data: result
    });
  } catch (error) {
    if (error.message === 'Submission not found or unauthorized') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Cannot update URL after submission has been checked') {
      return res.status(400).json({ error: error.message });
    }
    logger.error(error.message, { endpoint: "updateSubmissionUrl" });
    res.status(500).json({ error: "Internal server error" });
  }
});