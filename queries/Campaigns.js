import getDatabaseConnection from "../db.js";
import fs from 'fs';
import getImageNameFromBase64 from "../utils/getImageNameFromBase64.js";
const db = getDatabaseConnection();

const getAllCampaigns = (userId) => {
  return new Promise((resolve, reject) => {
    let query;
    let params = [];

    if (userId) {
      query = `
        SELECT c.*,
          MAX(CASE
            WHEN s.user_id IS NOT NULL THEN true
            ELSE false
          END) as is_participated,
          MAX(COALESCE(s.id, '')) as submission_id,
          COUNT(DISTINCT ss.id) as participant_count
        FROM campaigns c
        LEFT JOIN sns_submissions s ON c.id = s.campaign_id AND s.user_id = ? AND s.deleted_at IS NULL
        LEFT JOIN sns_submissions ss ON c.id = ss.campaign_id AND ss.deleted_at IS NULL
        WHERE c.deleted_at IS NULL AND c.status = 'active'
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
      params = [userId];
    } else {
      query = `
        SELECT c.*,
          false as is_participated,
          '' as submission_id,
          COUNT(DISTINCT ss.id) as participant_count
        FROM campaigns c
        LEFT JOIN sns_submissions ss ON c.id = ss.campaign_id AND ss.deleted_at IS NULL
        WHERE c.deleted_at IS NULL AND c.status = 'active'
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
    }

    db.query(query, params, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

// Admin function to get all campaigns regardless of status
const getAllCampaignsAdmin = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT c.*,
        COUNT(DISTINCT ss.id) as participant_count
      FROM campaigns c
      LEFT JOIN sns_submissions ss ON c.id = ss.campaign_id AND ss.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    db.query(query, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

// Update campaign status
const updateCampaignStatus = (campaignId, status) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE campaigns
      SET status = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `;

    db.query(query, [status, campaignId], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

const getCampaignById = (id) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT c.*, a.id as advertisement_id 
      FROM campaigns c
      LEFT JOIN advertisement a ON a.campaign_id = c.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `;
    db.query(query, [id], (err, result) => {
      if (err) reject(err);
      resolve(result[0]);
    });
  });
};

const createCampaignQuery = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      let images = "";
      
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        try {
          const promises = data.images.map(async (image, index) => {
            if (image && image.data_url) {
              return await getImageNameFromBase64(image.data_url, index);
            }
            return null;
          });

          const results = await Promise.all(promises);
          images = results.filter(result => result !== null).join(';');
        } catch (imageError) {
          console.error('Error processing images:', imageError);
          // Continue without images if there's an error
        }
      }

      const query = `
        INSERT INTO campaigns (
          name, description, start_date, end_date,
          max_participants, budget, reward_amount, image_gallery,
          created_by, company_id, status, deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NOW(), NOW())
      `;

      const values = [
        data.name,
        data.description,
        data.start_date,
        data.end_date,
        data.max_participants,
        data.budget,
        data.reward_amount,
        images || null,
        data.created_by,
        data.company_id
      ];
      
      db.query(query, values, (err, result) => {
        if (err) {
          console.error('Database error in createCampaignQuery:', err);
          return reject(err);
        }
        
        if (!result) {
          console.error('No result returned from database');
          return reject(new Error('Database query returned no result'));
        }
        
        // Safely access insertId with a fallback
        const insertId = result.insertId || 0;
        
        // Create advertisement listing for this campaign
        const adQuery = `
          INSERT INTO advertisement (
            category_id, campaign_id, created_by, status, title, description,
            price, image, start_date, end_date, created_by_type, company_id,
            created_at, updated_at
          ) VALUES (23, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'u', ?, NOW(), NOW())
        `;
        
        const adValues = [
          insertId, // campaign_id
          data.created_by,
          data.name,
          data.description,
          data.reward_amount, // Using reward_amount as price
          images ? images.split(';')[0] : null, // Use first image for listing
          data.start_date,
          data.end_date,
          data.company_id
        ];
        
        db.query(adQuery, adValues, (adErr, adResult) => {
          if (adErr) {
            console.error('Error creating advertisement for campaign:', adErr);
            // Still resolve with campaign data even if ad creation fails
          }
          
          resolve({
            id: insertId,
            ...data,
            image_gallery: images,
            advertisement_id: adResult ? adResult.insertId : null
          });
        });
      });
    } catch (error) {
      console.error('Error in createCampaignQuery:', error);
      reject(error);
    }
  });
};

const updateCampaign = (id, data) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE campaigns 
      SET 
        name = ?,
        description = ?,
        start_date = ?,
        end_date = ?,
        max_participants = ?,
        budget = ?,
        reward_amount = ?,
        status = ?,
        company_id = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    const values = [
      data.name,
      data.description,
      data.start_date,
      data.end_date,
      data.max_participants,
      data.budget,
      data.reward_amount,
      data.status,
      data.company_id,
      id
    ];
    db.query(query, values, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

const deleteCampaign = (id) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE campaigns 
      SET deleted_at = NOW() 
      WHERE id = ?
    `;
    db.query(query, [id], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

const getCampaignParticipants = (campaignId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        s.*, 
        u.name as user_name,
        u.email as user_email,
        u.mobile_number as user_phone
      FROM sns_submissions s
      JOIN users u ON s.user_id = u.id
      WHERE s.campaign_id = ? AND s.deleted_at IS NULL
    `;
    db.query(query, [campaignId], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

const submitCampaignParticipation = (data) => {
  return new Promise((resolve, reject) => {
    // Check if user already registered for this campaign
    const checkQuery = `
      SELECT id FROM sns_submissions 
      WHERE campaign_id = ? AND user_id = ? AND deleted_at IS NULL
    `;
    
    db.query(checkQuery, [data.campaign_id, data.user_id], (checkErr, checkResult) => {
      if (checkErr) {
        return reject(checkErr);
      }
      
      if (checkResult && checkResult.length > 0) {
        return reject(new Error('User already registered for this campaign'));
      }
      
      // Proceed with registration
      const query = `
        INSERT INTO sns_submissions (
          campaign_id, user_id, sns_url,
          deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, NOW(), NOW())
      `;
      const values = [
        data.campaign_id,
        data.user_id,
        data.sns_url || null  // Allow null sns_url
      ];
      db.query(query, values, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  });
};

const updateSubmissionCheckStatus = (submissionId, is_checked, note) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE sns_submissions 
      SET 
        is_checked = ?,
        checked_at = CASE WHEN ? = true THEN NOW() ELSE NULL END,
        note = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    db.query(query, [is_checked, is_checked, note, submissionId], (err, result) => {
      if (err) reject(err);
      resolve(result.affectedRows > 0);
    });
  });
};

const updateSubmissionRewardStatus = (submissionId, is_rewarded) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE sns_submissions 
      SET 
        is_rewarded = ?,
        rewarded_at = CASE WHEN ? = true THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = ?
    `;
    db.query(query, [is_rewarded, is_rewarded, submissionId], (err, result) => {
      if (err) reject(err);
      resolve(result.affectedRows > 0);
    });
  });
};

const getUserCampaigns = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT c.*, s.status as submission_status, s.id as submission_id
      FROM campaigns c
      JOIN sns_submissions s ON c.id = s.campaign_id
      WHERE s.user_id = ? AND c.deleted_at IS NULL AND s.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `
    db.query(query, [userId], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

const getSubmissionById = (submissionId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT s.*, c.reward_amount
      FROM sns_submissions s
      JOIN campaigns c ON s.campaign_id = c.id
      WHERE s.id = ? AND s.deleted_at IS NULL
    `;
    db.query(query, [submissionId], (err, result) => {
      if (err) reject(err);
      resolve(result[0]);
    });
  });
};

const removeParticipantFromCampaign = (submissionId) => {
  return new Promise((resolve, reject) => {
    // 1. First check if the submission exists and is not already deleted
    const checkQuery = `
      SELECT id FROM sns_submissions 
      WHERE id = ? AND deleted_at IS NULL
    `;
    
    db.query(checkQuery, [submissionId], (checkErr, checkResult) => {
      if (checkErr) {
        console.error('Error checking submission:', checkErr);
        return reject(checkErr);
      }
      
      if (!checkResult || checkResult.length === 0) {
        console.log('Submission not found or already deleted:', submissionId);
        return resolve(false);
      }
      
      // 2. If exists, proceed with the deletion
      const deleteQuery = `
        UPDATE sns_submissions 
        SET deleted_at = NOW(),
            is_rewarded = false
        WHERE id = ? AND deleted_at IS NULL
      `;
      
      db.query(deleteQuery, [submissionId], (err, result) => {
        if (err) {
          console.error('Error deleting submission:', err);
          return reject(err);
        }
        
        console.log('Delete result:', result);
        return resolve(result.affectedRows > 0);
      });
    });
  });
};

const getMyCampaigns = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT s.id) as participant_count,
        CASE 
          WHEN c.end_date < NOW() THEN 'completed'
          WHEN c.start_date > NOW() THEN 'upcoming'
          ELSE 'active'
        END as status
      FROM campaigns c
      LEFT JOIN sns_submissions s ON c.id = s.campaign_id AND s.deleted_at IS NULL
      WHERE c.created_by = ? AND c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    
    db.query(query, [userId], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

const getParticipatedCampaigns = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        s.id as participation_id,
        s.campaign_id,
        s.user_id,
        s.sns_url,
        s.submitted_at,
        s.is_checked,
        s.checked_at,
        s.is_rewarded,
        s.rewarded_at,
        s.note,
        CASE 
          WHEN s.is_rewarded = 1 THEN 'rewarded'
          WHEN s.is_checked = 1 THEN 'approved'
          WHEN s.is_checked = 0 AND s.note IS NOT NULL THEN 'rejected'
          ELSE 'pending'
        END as status,
        c.id as campaign_id,
        c.name as campaign_name,
        c.description as campaign_description,
        c.image_gallery,
        c.reward_amount,
        c.start_date,
        c.end_date
      FROM sns_submissions s
      JOIN campaigns c ON s.campaign_id = c.id
      WHERE s.user_id = ? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
      ORDER BY s.submitted_at DESC
    `;
    
    db.query(query, [userId], (err, result) => {
      if (err) reject(err);
      
      // Format the response to match the expected structure
      const formattedResult = result.map(row => ({
        participation_id: row.participation_id,
        campaign_id: row.campaign_id,
        user_id: row.user_id,
        sns_url: row.sns_url || null,  // Handle null URLs
        status: row.status,
        submitted_at: row.submitted_at,
        approved_at: row.checked_at,
        reward_sent: row.is_rewarded === 1,
        has_submitted_url: !!row.sns_url,  // New field to indicate if URL exists
        campaign: {
          id: row.campaign_id,
          name: row.campaign_name,
          description: row.campaign_description,
          image_gallery: row.image_gallery,
          reward_amount: row.reward_amount,
          start_date: row.start_date,
          end_date: row.end_date
        }
      }));
      
      resolve(formattedResult);
    });
  });
};

const updateSubmissionUrl = (submissionId, userId, snsUrl) => {
  return new Promise((resolve, reject) => {
    // First verify the submission belongs to the user
    const verifyQuery = `
      SELECT id, campaign_id, is_checked, is_rewarded 
      FROM sns_submissions 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `;
    
    db.query(verifyQuery, [submissionId, userId], (verifyErr, verifyResult) => {
      if (verifyErr) {
        return reject(verifyErr);
      }
      
      if (!verifyResult || verifyResult.length === 0) {
        return reject(new Error('Submission not found or unauthorized'));
      }
      
      const submission = verifyResult[0];
      
      // Don't allow URL update if already checked or rewarded
      if (submission.is_checked) {
        return reject(new Error('Cannot update URL after submission has been checked'));
      }
      
      // Update the URL
      const updateQuery = `
        UPDATE sns_submissions 
        SET sns_url = ?, updated_at = NOW()
        WHERE id = ? AND user_id = ?
      `;
      
      db.query(updateQuery, [snsUrl, submissionId, userId], (updateErr, updateResult) => {
        if (updateErr) {
          return reject(updateErr);
        }
        
        resolve({
          success: true,
          submission_id: submissionId,
          campaign_id: submission.campaign_id,
          sns_url: snsUrl
        });
      });
    });
  });
};

export {
  getAllCampaigns,
  getAllCampaignsAdmin,
  getCampaignById,
  createCampaignQuery,
  updateCampaign,
  updateCampaignStatus,
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
};