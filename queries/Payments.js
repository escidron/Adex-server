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
  nameOnCard,
  formattedCreatedAt,
  isDefault,
  companyId
) {
  const queryInsertCard = `
    INSERT INTO cards (
      user_id,
      stripe_payment_method_id,
      name,
      is_default,
      is_active,
      created_at,
      company_id
    ) VALUES (
      '${userId}',
      '${cardId}',
      '${nameOnCard}',
      ${isDefault ? '1' : '0'},
      '1',
      '${formattedCreatedAt}',
      ${companyId ? companyId : null}

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

export async function deleteCreditCard(userId, cardId, formattedDeletedAt) {
  const deleteCardQuery = `
  UPDATE cards
  SET deleted_at = '${formattedDeletedAt}',
  is_active = '0',
  is_default = '0'
  WHERE user_id = ${userId} and stripe_payment_method_id = '${cardId}'
`;

  return new Promise((resolve, reject) => {
    db.query(deleteCardQuery, (err, result) => {
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
  bankAccount,
  formattedCreatedAt,
  isDefault,
  companyId
) {
  const insertAccountQuery = `
  INSERT INTO external_bank_accounts (
    user_id,
    external_account_id,
    is_default,
    is_active,
    created_at,
    company_id
  ) VALUES (
    '${userId}',
    '${bankAccount.id}',
    ${isDefault ? '1' : '0'},
    '1',
    '${formattedCreatedAt}',
    ${companyId ? companyId : null}
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

export async function updateAccount(userId, bankAccount, formattedCreatedAt) {
  const updateAccountQuery = `
  UPDATE external_bank_accounts
  SET updated_at = '${formattedCreatedAt}',
  is_default = CASE
  WHEN external_account_id <> '${bankAccount}' THEN 0
  WHEN external_account_id = '${bankAccount}' THEN 1
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

export async function deleteExternalBankAccount(userId, bankAccount, formattedDeletedAt) {
  const deleteAccountQuery = `
  UPDATE external_bank_accounts
  SET deleted_at = '${formattedDeletedAt}',
  is_active = '0'
  WHERE user_id = ${userId} and external_account_id = '${bankAccount}'
`;

  return new Promise((resolve, reject) => {
    db.query(deleteAccountQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}


//contracts queries
export async function insertContract(
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
    schedule_subscription_id,
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
    '${subscription.subscription}',
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

export async function getContract(
  advertisementId,
  sellerStripeId,
  buyerStripeId,

) {
  const getContractQuery = `
  SELECT * FROM adex.contracts where 
  advertisement_id = ${advertisementId} and 
  seller_id = '${sellerStripeId}' and 
  buyer_id ='${buyerStripeId}'
  and contract_status = '1'
  
`;
  return new Promise((resolve, reject) => {
    db.query(getContractQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getContractById(contractId) {
  const getContractQuery = `
  SELECT * FROM adex.contracts where 
  schedule_subscription_id = '${contractId}'
`;
  return new Promise((resolve, reject) => {
    db.query(getContractQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}


export async function getContractBySub(subscriptionId) {
  const getContractQuery = `
  SELECT * FROM adex.contracts where 
  subscription_id = '${subscriptionId}'
`;
  return new Promise((resolve, reject) => {
    db.query(getContractQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateContract(
  contractId,
  status,
  cancelMessage,
) {
  const updateContractQuery = `
  UPDATE contracts
  SET contract_status = '${status}',
      cancel_message = '${cancelMessage?cancelMessage:''}'
  WHERE schedule_subscription_id = '${contractId}'
`;
  return new Promise((resolve, reject) => {
    db.query(updateContractQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updatePhaseDateContract(
  contractId,
  phaseStartDate
) {
  const updateContractQuery = `
  UPDATE contracts
  SET phase_start_date = '${phaseStartDate}'
  WHERE schedule_subscription_id = '${contractId}'
`;
  return new Promise((resolve, reject) => {
    db.query(updateContractQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateContractInvoidePaid(
  subscriptionId
) {
  const updateContractQuery = `
  UPDATE adex.contracts
  SET invoices_paid = invoices_paid + 1
  WHERE subscription_id = '${subscriptionId}'
`;
  return new Promise((resolve, reject) => {
    db.query(updateContractQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateContractSubscriptionId(
  subscriptionId,
  scheduleId,
  phaseStartDate
) {
  const updateContractQuery = `
  UPDATE adex.contracts
  SET subscription_id = '${subscriptionId}' ${phaseStartDate?`,phase_start_date = ${phaseStartDate}`:''}
  WHERE schedule_subscription_id = '${scheduleId}'
`;
  return new Promise((resolve, reject) => {
    db.query(updateContractQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateContractCancellationStatus(
  advertisementId,
  sellerStripeId,
  buyerStripeId,

) {
  const updateContractQuery = `
  UPDATE contracts
  SET cancellation_allowed = '0' where 
  advertisement_id = ${advertisementId} and 
  seller_id = '${sellerStripeId}' and 
  buyer_id ='${buyerStripeId}'
  and contract_status = '1'
  
`;
  return new Promise((resolve, reject) => {
    db.query(updateContractQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

