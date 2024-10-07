const createReverseListingTable = `
CREATE TABLE IF NOT EXISTS reverse_listing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    category_id INT,
    title varchar(255),
    address varchar(255),
    latitude varchar(255),
    longitude varchar(255),
    description varchar(255),
    sub_asset_type varchar(2),
    media_types varchar(2),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at timestamp
    );
`;

export default createReverseListingTable;
