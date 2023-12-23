const createSellersTable = `
CREATE TABLE IF NOT EXISTS sellers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    company_id VARCHAR(45),
    stripe_account VARCHAR(45),
    external_account_id VARCHAR(45),
    verified_identity VARCHAR(1),
    created_at DATE,
    updated_at DATE
  );
`;

export default createSellersTable;