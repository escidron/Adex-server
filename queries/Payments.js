import getDatabaseConnection from ".././db.js";

const db = getDatabaseConnection();

//card queries
export async function getCard(userId) {
  const getCardQuery = `SELECT * FROM adex.cards where user_id = ${userId}`;
  return new Promise((resolve, reject) => {
    db.query(getCardQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function insertCard(
  userId,
  cardId,
  brand,
  nameOnCard,
  cardNumber,
  exp_year,
  exp_month,
  formattedCreatedAt
) {
  const queryInsertCard = `
    INSERT INTO cards (
      user_id,
      stripe_payment_method_id,
      card_brand,
      name,
      card_number,
      expiry_date,
      is_default,
      is_active,
      created_at
    ) VALUES (
      '${userId}',
      '${cardId}',
      '${brand}',
      '${nameOnCard}',
      '${cardNumber}',
      STR_TO_DATE(CONCAT(${exp_year}, '-', ${exp_month}, '-01'), '%Y-%m-%d'),
      '1',
      '1',
      '${formattedCreatedAt}'

    )
  `;
  return new Promise((resolve, reject) => {
    db.query(queryInsertCard, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateCard(query) {
  return new Promise((resolve, reject) => {
    db.query(query, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//account queries
//delete infos

export async function getExternalAccount(userId) {
  const getExternalAccountQuery = `SELECT * FROM adex.external_bank_accounts where user_id = ${userId}`;
  return new Promise((resolve, reject) => {
    db.query(getExternalAccountQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function insertAccount(
  userId,
  routingNumber,
  accountNumber,
  bankAccount,
  bankAccountName,
  formattedCreatedAt
) {
  const insertAccountQuery = `
  INSERT INTO external_bank_accounts (
    user_id,
    routing_number,
    account_number,
    external_account_id,
    bank_name,
    is_default,
    is_active,
    created_at
  ) VALUES (
    '${userId}',
    '${routingNumber}',
    '${accountNumber}',
    '${bankAccount.id}',
    '${bankAccountName}',
    '1',
    '1',
    '${formattedCreatedAt}'
  )
`;
  return new Promise((resolve, reject) => {
    db.query(insertAccountQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateAccount(userId,bankAccount,formattedCreatedAt) {

  const updateAccountQuery = `
  UPDATE external_bank_accounts
  SET updated_at = '${formattedCreatedAt}',
  is_default = CASE
  WHEN external_account_id <> '${bankAccount.id}' THEN 0
  WHEN external_account_id = '${bankAccount.id}' THEN 1
  END
  WHERE user_id = ${userId}
`;

  return new Promise((resolve, reject) => {
    db.query(updateAccountQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}


//contarcts queries
export async function insetContract(
  subscription,
  sellerAccount,
  customerId,
  data,
  startDateFormatted,
  endDateFormatted,
  formattedUpdatedAt
) {
  const inserContract = `
  INSERT INTO contracts (
    subscription_id,
    seller_id,
    buyer_id,
    advertisement_id,
    contract_status,
    start_date,
    end_date,
    created_at
  ) VALUES (
    '${subscription.id}',
    '${sellerAccount}',
    '${customerId}',
    '${data.id}',
    '1',
    '${startDateFormatted}',
    '${endDateFormatted}',
    '${formattedUpdatedAt}'
  )
`;
  return new Promise((resolve, reject) => {
    db.query(inserContract, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}