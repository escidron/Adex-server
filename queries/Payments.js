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
      ${isDefault ? "1" : "0"},
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
    ${isDefault ? "1" : "0"},
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

export async function deleteExternalBankAccount(
  userId,
  bankAccount,
  formattedDeletedAt
) {
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
    seller_stripe_id,
    buyer_stripe_id,
    advertisement_id,
    contract_status,
    start_date,
    end_date,
    created_at,
    seller_id,
    seller_company_id,
    buyer_id,
    buyer_company_id,
    price,
    ad_duration_type,
    duration
  ) VALUES (
    '${subscription.id}',
    '${subscription.subscription}',
    '${sellerAccount}',
    '${customerId}',
    '${data.id}',
    '1',
    '${startDateFormatted}',
    '${endDateFormatted}',
    '${formattedUpdatedAt}',
  '${data.created_by}',
    ${data.company_id ? data.company_id : null},
    ${data.requested_by},
    ${data.requested_by_company ? data.requested_by_company : null},
    ${data.price},
    '${data.ad_duration_type}',
    ${data.duration}
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
  buyerStripeId
) {
  const getContractQuery = `
  SELECT * FROM adex.contracts where 
  advertisement_id = ${advertisementId} and 
  seller_stripe_id = '${sellerStripeId}' and 
  buyer_stripe_id ='${buyerStripeId}'
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

export async function getFinishedContract(sellerId, buyerId) {
  const getFinishedContractQuery = `
  SELECT advertisement.*, 
  advertisement.price AS new_price,
  advertisement.ad_duration_type AS new_ad_duration_type,
  advertisement.duration AS new_duration,
  advertisement.requested_by AS new_requested_by,
  advertisement.requested_by_company AS new_requested_by_company,
  contracts.price,
  contracts.ad_duration_type,
  contracts.duration,
  contracts.id as contract_id,
  contracts.buyer_id as requested_by,
  contracts.is_rated_by_seller,
  contracts.is_rated_by_buyer,
  contracts.buyer_company_id as requested_by_company,
  3 AS status,
  users.name as ${buyerId ? "seller_name" : "buyer_name"},
  users.profile_image as ${
    buyerId ? "seller_profile_image" : "buyer_profile_image"
  },
  users.user_type,
  users.rating as ${buyerId ? "seller_rating" : "buyer_rating"},
  companies.company_name,
  companies.company_logo,
  companies.rating as company_rating
  FROM contracts
  JOIN advertisement ON advertisement.id = contracts.advertisement_id COLLATE utf8mb4_unicode_ci
  JOIN users ON users.id = ${
    buyerId ? "contracts.seller_id" : "contracts.buyer_id"
  } COLLATE utf8mb4_unicode_ci
  LEFT JOIN companies ON companies.id = ${
    buyerId ? "contracts.seller_company_id" : "contracts.buyer_company_id"
  } COLLATE utf8mb4_unicode_ci
  where ${
    buyerId
      ? `contracts.buyer_id = ${buyerId}`
      : `contracts.seller_id = ${sellerId}`
  }  and contract_status = '2'
`;
  return new Promise((resolve, reject) => {
    db.query(getFinishedContractQuery, (err, result) => {
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
  id = '${contractId}'
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
export async function getContractByStripeId(contractId) {
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

export async function updateContract(contractId, status, cancelMessage) {
  const updateContractQuery = `
  UPDATE contracts
  SET contract_status = '${status}',
      cancel_message = '${cancelMessage ? cancelMessage : ""}'
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

export async function updateContractRatingStatus(
  contractId,
  isRatedBySeller,
  isRatedByBuyer
) {
  const updateContractQuery = `
  UPDATE contracts
  SET is_rated_by_seller = '${isRatedBySeller}',is_rated_by_buyer = '${isRatedByBuyer}'
  WHERE id = '${contractId}'
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

export async function updatePhaseDateContract(contractId, phaseStartDate) {
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

export async function updateContractInvoidePaid(subscriptionId) {
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
  SET subscription_id = '${subscriptionId}' ${
    phaseStartDate ? `,phase_start_date = ${phaseStartDate}` : ""
  }
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
  buyerStripeId
) {
  const updateContractQuery = `
  UPDATE contracts
  SET cancellation_allowed = '0' where 
  advertisement_id = ${advertisementId} and 
  seller_stripe_id = '${sellerStripeId}' and 
  buyer_stripe_id ='${buyerStripeId}'
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

export async function checkFinishedListing() {
  const currentDate = new Date();
  const checkFinishedListingQuery = `
  SELECT advertisement.id as advertisement_id,contracts.id as contract_id
  FROM advertisement
  JOIN contracts ON advertisement.id = contracts.advertisement_id COLLATE utf8mb4_unicode_ci
  where  contracts.contract_status = '1' and advertisement.end_date <= CURDATE()
`;

  return new Promise((resolve, reject) => {
    db.query(checkFinishedListingQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateFinishedListingAndContract() {
  const updateFinishedListingQuery = `
  UPDATE advertisement
  JOIN contracts ON advertisement.id = contracts.advertisement_id COLLATE utf8mb4_unicode_ci
  SET advertisement.duration = null,advertisement.requested_by = null, advertisement.requested_by_company = null, advertisement.status = '1',
    advertisement.start_date = CASE WHEN contracts.ad_duration_type <> 1 THEN NULL ELSE advertisement.start_date END,
    advertisement.end_date = CASE WHEN contracts.ad_duration_type <> 1 THEN NULL ELSE advertisement.end_date END,
    contracts.contract_status = '2'
  WHERE contracts.contract_status = 1 AND advertisement.end_date <= CURDATE();
  
`;

  return new Promise((resolve, reject) => {
    db.query(updateFinishedListingQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateFinishedContract(contractId) {
  const currentDate = new Date();
  const checkFinishedListingQuery = `
  SELECT advertisement.id as advertisement_id,contracts.id as contract_id
  FROM advertisement
  JOIN contracts ON advertisement.id = contracts.advertisement_id COLLATE utf8mb4_unicode_ci
  where  contracts.contract_status = '1' and advertisement.end_date <= CURDATE()
`;

  return new Promise((resolve, reject) => {
    db.query(checkFinishedListingQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
