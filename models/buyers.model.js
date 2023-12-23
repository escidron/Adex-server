const createBuyersTable = `
CREATE TABLE IF NOT EXISTS buyers (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id int,
    company_id varchar(45),
    customer_id varchar(255),
    name varchar(255),
    email varchar(255),
    default_card varchar(255),
    created_at timestamp,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at timestamp
  );
`;

export default createBuyersTable;
