const createDiscountsTable = `
CREATE TABLE IF NOT EXISTS discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    advertisement_id VARCHAR(45),
    duration INT,
    discount INT,
    created_at TIMESTAMP
);
`;

export default createDiscountsTable;