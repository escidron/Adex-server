const createNotificationsTable = `
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(45),
    header VARCHAR(255),
    message VARCHAR(255),
    redirect VARCHAR(255),
    readed varchar(1), 
    \`key\` VARCHAR(45) 
);
`

export default createNotificationsTable;