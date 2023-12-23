 const createAdvertisementTable = `
 CREATE TABLE IF NOT EXISTS advertisement (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id bigint,
    created_by int,
    status int,
    title varchar(255),
    description text,
    price double(15,4),
    image varchar(255),
    address varchar(255),
    lat varchar(255),
    longitude varchar(255),  -- Alteração aqui
    ad_duration_type varchar(1),
    duration int,
    units int,
    per_unit_price double(15,4),
    start_date date,
    end_date date,
    first_available_date date,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at timestamp,
    created_by_type varchar(1),
    sub_asset_type varchar(2),
    stripe_product_id varchar(45),
    stripe_price varchar(45),
    profile_image varchar(255),
    requested_by varchar(45),
    requested_by_company varchar(45),
    company_id varchar(45),
    is_draft varchar(1),
    instructions longtext
  )
`;

export default createAdvertisementTable;