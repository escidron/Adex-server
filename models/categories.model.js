const createCategoriesTable = `
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image VARCHAR(255),
  parent_id BIGINT,
  is_one_time BIGINT,
  is_periodic BIGINT,
  is_units BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
  );
`;

export default createCategoriesTable;