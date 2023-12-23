const createNotificationsTable = `
CREATE TABLE IF NOT EXISTS notifications (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_type varchar(255),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at timestamp
  );
`;

export default createNotificationsTable;