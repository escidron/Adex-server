const createCampaignsTable = `
  CREATE TABLE IF NOT EXISTS campaigns (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name varchar(255) NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    max_participants int,
    budget decimal(15,4),
    reward_amount decimal(15,4),
    image_gallery text,
    created_by bigint UNSIGNED NOT NULL,
    status ENUM('pending', 'active', 'rejected') DEFAULT 'pending',
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at timestamp NULL,
    INDEX idx_campaign_status (status)
  )
`;

export default createCampaignsTable; 