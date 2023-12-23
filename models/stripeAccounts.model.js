const createStripeAccountTable = `
CREATE TABLE IF NOT EXISTS stripe_account (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    is_default INT,
    stripe_account_id VARCHAR(255),
    account_holder_name VARCHAR(255),
    account_number VARCHAR(255),
    routing_number VARCHAR(255),
    account_holder_type VARCHAR(255),
    bank_account_id VARCHAR(255),
    charges_enabled TINYINT,
    payouts_enabled TINYINT,
    business_id INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
  );
`;

export default createStripeAccountTable;