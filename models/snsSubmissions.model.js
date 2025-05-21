const createSnsSubmissionsTable = `
  CREATE TABLE IF NOT EXISTS sns_submissions (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id bigint UNSIGNED NOT NULL,
    user_id bigint UNSIGNED NOT NULL,
    sns_url varchar(255) NOT NULL,
    submitted_at timestamp DEFAULT CURRENT_TIMESTAMP,
    is_checked tinyint(1) DEFAULT 0,
    checked_at timestamp NULL,
    is_rewarded tinyint(1) DEFAULT 0,
    rewarded_at timestamp NULL,
    note text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at timestamp NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`;

export default createSnsSubmissionsTable; 