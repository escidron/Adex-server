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
        WHERE c.deleted_at IS NULL
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
        WHERE c.deleted_at IS NULL
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

const getCampaignById = (id) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM campaigns 
      WHERE id = ? AND deleted_at IS NULL
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
        const promises = data.images.map(async (image, index) => {
          if (image && image.data_url) {
            return await getImageNameFromBase64(image.data_url, index);
          }
          return null;
        });

        const results = await Promise.all(promises);
        images = results.filter(result => result !== null).join(';');
      }

      const query = `
        INSERT INTO campaigns (
          name, description, start_date, end_date, 
          max_participants, budget, reward_amount, image_gallery,
          deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())
      `;
      
      const values = [
        data.name,
        data.description,
        data.start_date,
        data.end_date,
        data.max_participants,
        data.budget,
        data.reward_amount,
        images || null
      ];
      
      db.query(query, values, (err, result) => {
        if (err) reject(err);
        resolve({
          id: result.insertId,
          ...data,
          image_gallery: images
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
    const query = `
      INSERT INTO sns_submissions (
        campaign_id, user_id, sns_url,
        deleted_at, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, NOW(), NOW())
    `;
    const values = [
      data.campaign_id,
      data.user_id,
      data.sns_url
    ];
    db.query(query, values, (err, result) => {
      if (err) reject(err);
      resolve(result);
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

export {
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
};