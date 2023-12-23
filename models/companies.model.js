const createCompaniesTable = `
CREATE TABLE IF NOT EXISTS companies (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id int,
    company_name varchar(255),
    email varchar(255),
    phone varchar(255),
    address varchar(255),
    lat varchar(255),
    lng varchar(255),
    company_info varchar(255),
    company_logo varchar(255),
    company_gallery longtext,
    industry varchar(1),
    has_physical_space varchar(1),
    created_at timestamp,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at timestamp
  );
`;

export default createCompaniesTable;