const createContactUsTable = `
CREATE TABLE IF NOT EXISTS contact_us (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name varchar(255),
    email varchar(255),
    subject varchar(255),
    phone varchar(255),
    message text,
    created_at timestamp,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
`;

export default createContactUsTable;