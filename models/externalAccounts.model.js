const createExternalAccountsTable = `
CREATE TABLE IF NOT EXISTS external_bank_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    external_account_id VARCHAR(45),
    is_default VARCHAR(1),
    is_active VARCHAR(1),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    company_id VARCHAR(45)
  );
`;

export default createExternalAccountsTable;