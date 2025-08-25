import { getCampaignById } from '../queries/Campaigns.js';

// Parse invoice filename to extract information
// Format: invoice_companyId_campaignId_timestamp.pdf
export function parseInvoiceFilename(filename) {
  const match = filename.match(/^invoice_(\d+)_(\d+)_(\d+)\.pdf$/);
  
  if (!match) {
    throw new Error('Invalid invoice filename format');
  }

  const [, companyId, campaignId, timestamp] = match;
  
  return {
    companyId: parseInt(companyId),
    campaignId: parseInt(campaignId),
    timestamp: parseInt(timestamp)
  };
}

// Convert filename to full invoice object
export async function filenameToInvoiceObject(filename, serverIp) {
  try {
    const { campaignId, timestamp } = parseInvoiceFilename(filename);
    
    // Get campaign name
    let campaignName = 'Unknown Campaign';
    try {
      const campaign = await getCampaignById(campaignId);
      if (campaign && campaign.name) {
        campaignName = campaign.name;
      }
    } catch (error) {
      // If campaign not found, use default name
    }
    
    // Convert timestamp to formatted date
    const generatedAt = new Date(timestamp).toLocaleString('sv-SE').replace('T', ' ');
    
    return {
      campaign_id: campaignId,
      campaign_name: campaignName,
      pdf_url: `${serverIp}/pdfs/${filename}`,
      filename: filename,
      generated_at: generatedAt
    };
  } catch (error) {
    // Fallback for malformed filenames
    return {
      campaign_id: 0,
      campaign_name: 'Unknown Campaign', 
      pdf_url: `${serverIp}/pdfs/${filename}`,
      filename: filename,
      generated_at: 'Unknown'
    };
  }
}