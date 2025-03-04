const createSellersTable = `
CREATE TABLE IF NOT EXISTS user_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_user_id INT,
    receiver_user_id INT,
    advertisement_id INT,
    paypal_receiver_email VARCHAR(100),
    payment_method VARCHAR(45),
    payment_id VARCHAR(100) NULL,
    payout_id VARCHAR(100) NULL,
    pay_to_acc ENUM('ADEXER', 'USER'),
    status ENUM('CREATED', 'COMPLETED'),
    currency_code VARCHAR(3),
    amount DECIMAL(10, 2),
    payment_date timestamp NULL,
    payout_date timestamp NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
  );
`;

export default createSellersTable;