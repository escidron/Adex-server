const createContractsTable = `
CREATE TABLE IF NOT EXISTS contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_subscription_id VARCHAR(45) NOT NULL,
    subscription_id VARCHAR(45),
    seller_id VARCHAR(45),
    buyer_id VARCHAR(45),
    advertisement_id VARCHAR(45),
    contract_status VARCHAR(1),
    cancel_message LONGTEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    invoices_paid INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    phase_start_date VARCHAR(45),
    cancellation_allowed VARCHAR(1)
  );
`;

export default createContractsTable;