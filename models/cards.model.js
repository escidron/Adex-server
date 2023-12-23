const createCardsTable = `
CREATE TABLE IF NOT EXISTS cards (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id int,
    company_id varchar(45),
    card_id varchar(255),
    stripe_card_token_id varchar(255),
    stripe_payment_method_id varchar(255),
    name varchar(255),
    card_type int,
    is_default int,
    is_active int,
    created_at timestamp,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at timestamp
  );
`;

export default createCardsTable;