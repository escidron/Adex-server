const createMessagesTable = `
CREATE TABLE IF NOT EXISTS messages (
    id bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sended_by varchar(45) 
    seller_id varchar(45) 
    buyer_id varchar(45) 
    advertisement_id varchar(45) 
    created_at timestamp 
    message longtext
    files longtext
  );
`;

export default createMessagesTable;