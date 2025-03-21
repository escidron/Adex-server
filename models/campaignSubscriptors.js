const createCampaignSubscribersTable = `
CREATE TABLE IF NOT EXISTS campaign_subscribers (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id int,
    subscriber_id int,
    subscriber_company_id int,
    created_at timestamp,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at timestamp,
    evidence varchar(255)
  );
`;

export default createCampaignSubscribersTable;