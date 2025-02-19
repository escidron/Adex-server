const createNotificationsTable = `
CREATE TABLE IF NOT EXISTS notifications (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    user_id varchar(45),
    header varchar(255),
    message varchar(255),
    redirect varchar(255),
    read varchar(1)
    key varchar(45)
  );
`;

export default createNotificationsTable;