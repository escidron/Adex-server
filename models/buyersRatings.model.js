const createBuyersRatingTable = `
CREATE TABLE IF NOT EXISTS  buyers_ratings (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  buyer_id varchar(45) DEFAULT NULL,
  company_id varchar(45) DEFAULT NULL,
  rated_by_id varchar(45) DEFAULT NULL,
  rated_by_company_id varchar(45) DEFAULT NULL,
  comments varchar(255) DEFAULT NULL,
  rating float(10,2) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at timestamp NULL DEFAULT NULL,
  contract_id varchar(45) DEFAULT NULL,
  PRIMARY KEY (id)
)
`;

export default createBuyersRatingTable;