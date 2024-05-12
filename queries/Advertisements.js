import getDatabaseConnection from ".././db.js";
import escapeText from "../utils/escapeText.js";

const db = getDatabaseConnection();

export async function getFilteredAdvertisements(
  priceMin,
  priceMax,
  type,
  adGroup
) {
  let types = "";
  if (type == 1) {
    types = "4,5,6,7,8";
  } else if (type == 2) {
    types = "9,10,11,12";
  } else if (type == 3) {
    types = "17,18";
  }

  const FilteredAdvertisementsQuery = `SELECT * FROM adex.advertisement where status <> '0' and price BETWEEN ${
    priceMin != "" ? priceMin : 0
  } AND ${priceMax != "" ? priceMax : 0} ${
    type ? "and category_id IN (" + types + ")" : ""
  } ${adGroup ? "and created_by_type=" + adGroup : ""}`;

  return new Promise((resolve, reject) => {
    db.query(FilteredAdvertisementsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
//add the id of the user is filtering so does not return his listings
export async function getAllAdvertisements() {
  const allAdvertisementsQuery = `SELECT * FROM advertisement where status NOT IN('0','5')`;

  return new Promise((resolve, reject) => {
    db.query(allAdvertisementsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getAdvertisementByCreator(userId, id,companyId) {
  // const advertisementByCreateorQuery = `SELECT * FROM adex.advertisement where is_draft = '0' and  created_by = ${userId} 
  const advertisementByCreateorQuery = `SELECT * FROM adex.advertisement where  created_by = ${userId} 
  ${id ? "and id=" + id : ""} ${companyId ? "and company_id=" + companyId : ""}`;
  return new Promise((resolve, reject) => {
    db.query(advertisementByCreateorQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getAdvertisementById(id) {
  const advertisementByIdQuery = `SELECT * FROM adex.advertisement where id = ${id}`;

  return new Promise((resolve, reject) => {
    db.query(advertisementByIdQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
export async function getPendingBookings(userId) {
  const PendingBookingsQuery = `SELECT * FROM adex.advertisement where status = '4' and requested_by = ${userId}`;

  return new Promise((resolve, reject) => {
    db.query(PendingBookingsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getAdvertisementAndBuyers(userId) {
  const advertisementAndBuyersQuery = `
    SELECT *
    FROM contracts
    JOIN buyers ON contracts.buyer_stripe_id = buyers.customer_id COLLATE utf8mb4_unicode_ci
    JOIN advertisement ON advertisement.id = contracts.advertisement_id COLLATE utf8mb4_unicode_ci
    where buyers.user_id = ${userId}  and contract_status = '1'
    `;
  return new Promise((resolve, reject) => {
    db.query(advertisementAndBuyersQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function insertAdvertisement(
  data,
  userId,
  parsedValue,
  images,
  formattedCreatedAt,
  product,
  price,
  userType,
  dateFormatted,
  availableDateFormatted
) {
  const CreateAdvertisementQuery = `
    INSERT INTO advertisement (
      category_id,
      created_by,
      title,
      description,
      price,
      image,
      address,
      lat,
      \`long\`,
      ad_duration_type,
      status,
      created_at,
      sub_asset_type,
      units,
      per_unit_price,
      stripe_product_id,
      stripe_price,
      created_by_type,
      is_draft,
      company_id
      ${data.date ? ",start_date" : ""}
      ${data.date ? ",end_date" : ""}
      ${availableDateFormatted ? ",first_available_date" : ""}
      ${data.instructions ? ",instructions" : ""}
      ${data.media_types ? ",media_types" : ""}
      ${data.digital_price_type ? ",digital_price_type" : ""}
      ) VALUES (
      '${data.category_id}',
      '${userId}',
      ${escapeText(data.title)},
      ${escapeText(data.description)},
      '${parsedValue}',
      '${images}',
      ${escapeText(data.address)},
      '${data.lat}',
      '${data.long}',
      '${data.ad_duration_type ? data.ad_duration_type : 0}',
      '${data.has_payout_method ? "1" : "0"}',
      '${formattedCreatedAt}',
      '${data.sub_asset_type}',
      '${data.units ? data.units : 0}',
      ${data.per_unit_price},
      '${product.id}',
      '${price.id}',
      '${userType}',
      '0',
      '${data.company_id}' 
      ${data.date ? `,'${dateFormatted.from}'` : ""}
      ${data.date ? `,'${dateFormatted.to}'` : ""}
      ${availableDateFormatted ? `,'${availableDateFormatted}'` : ""}
      ${data.instructions ? `,${escapeText(data.instructions)}` : ""}
      ${data.media_types ? `,${data.media_types}` : ""}
      ${data.digital_price_type ? `,${data.digital_price_type}` : ""}

      
    )
  `;
  return new Promise((resolve, reject) => {
    db.query(CreateAdvertisementQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
export async function insertDraft(
  title,
  description,
  price,
  category_id,
  images,
  address,
  lat,
  long,
  ad_duration_type,
  sub_asset_type,
  per_unit_price,
  dateFormatted,
  availableDateFormatted,
  instructions,
  company_id,
  userId,
  createdAt
) {
  const CreateDraftQuery = `
    INSERT INTO advertisement (
      title,
      description,
      price,
      category_id,
      image,
      address,
      lat,
      \`long\`,
      ad_duration_type,
      sub_asset_type,
      per_unit_price,
      company_id,
      start_date,
      end_date,
      first_available_date,
      instructions,
      created_by,
      created_at
    ) VALUES (
      ${title ? `${escapeText(title)}` : null},
      ${description ? `${escapeText(description)}` : null},
      ${price ? price : null},
      ${category_id ? `'${category_id}'` : null},
      ${images ? `'${images}'` : null},
      ${address ? `${escapeText(address)}` : null},
      ${lat ? lat : null},
      ${long ? long : null},
      ${ad_duration_type ? `'${ad_duration_type}'` : null},
      ${sub_asset_type ? `'${sub_asset_type}'` : null},
      ${per_unit_price ? per_unit_price : null},
      ${company_id ? `'${company_id}'` : null},
      ${dateFormatted ? `'${dateFormatted.from}'` : null},
      ${dateFormatted ? `'${dateFormatted.to}'` : null},
      ${availableDateFormatted ? `'${availableDateFormatted}'` : null},
      ${instructions ? `${escapeText(instructions)}` : null},
      '${userId}',
      '${createdAt}'
    )
  `;
  return new Promise((resolve, reject) => {
    db.query(CreateDraftQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getParentCategoryId(id) {
  const ParentCategoryIdQuery = `SELECT parent_id FROM categories where id = ${id}`;

  return new Promise((resolve, reject) => {
    db.query(ParentCategoryIdQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getDraftByUserId(id) {
  const draftByUserIdQuery = `SELECT * FROM adex.advertisement where created_by = ${id} and is_draft = '1'`;

  return new Promise((resolve, reject) => {
    db.query(draftByUserIdQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateDraft(
  id,
  title,
  description,
  price,
  category_id,
  images,
  address,
  lat,
  long,
  ad_duration_type,
  sub_asset_type,
  per_unit_price,
  dateFormatted,
  availableDateFormatted,
  instructions,
  company_id,
  createdAt
) {
  const updateDraftQuery = `
    UPDATE advertisement SET
      title = ${title ? `${escapeText(title)}` : null},
      description =  ${description ? `${escapeText(description)}` : null},
      price = ${price ? price : null},
      category_id = ${category_id ? `'${category_id}'` : null},
      image = ${images ? `'${images}'` : null},
      address = ${address ? `${escapeText(address)}` : null},
      lat = ${lat ? lat : null},
      \`long\` = ${long ? long : null},
      ad_duration_type = ${ad_duration_type ? `'${ad_duration_type}'` : null},
      sub_asset_type = ${sub_asset_type ? `'${sub_asset_type}'` : null},
      per_unit_price = ${per_unit_price ? per_unit_price : null},
      company_id = ${company_id ? `'${company_id}'` : null},
      start_date =  ${dateFormatted ? `'${dateFormatted.from}'` : null},
      end_date =  ${dateFormatted ? `'${dateFormatted.to}'` : null},
      first_available_date =  ${
        availableDateFormatted ? `'${availableDateFormatted}'` : null
      },
      instructions =  ${instructions ? `${escapeText(instructions)}` : null},
      company_id = ${company_id ? `'${company_id}'` : null},
      updated_at = '${createdAt}'
    WHERE id = ${id}
  `;
  return new Promise((resolve, reject) => {
    db.query(updateDraftQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function DraftToAdvertisement(
  id,
  data,
  userId,
  parsedValue,
  images,
  formattedCreatedAt,
  product,
  price,
  userType,
  startDateFormatted,
  availableDateFormatted
) {
  const updateDraftQuery = `
    UPDATE advertisement SET
      title = ${escapeText(data.title)},
      description =  ${escapeText(data.description)},
      price = '${parsedValue}',
      category_id = ${data.category_id ? `'${data.category_id}'` : null},
      image = '${images}',
      address = ${escapeText(data.address)},
      lat = '${data.lat}',
      \`long\` = '${data.long}',
      ad_duration_type = '${data.ad_duration_type ? data.ad_duration_type : 0}',
      sub_asset_type = '${data.sub_asset_type}',
      media_types = ${data.media_types ? `'${data.media_types}'` : null},
      per_unit_price = ${data.per_unit_price ? data.per_unit_price : 0},
      company_id = ${data.company_id && data.company_id != 'null' ? `'${data.company_id}'` : null},
      start_date =  ${startDateFormatted ? `'${startDateFormatted.from}'` : null},
      end_date =  ${startDateFormatted ? `'${startDateFormatted.to}'` : null},
      first_available_date =  ${availableDateFormatted ? `'${availableDateFormatted}'` : null},
      created_at = '${formattedCreatedAt}',
      created_by = '${userId}',
      status = ${data.has_payout_method ? '1' : '0'},
      stripe_product_id = '${product.id}',
      stripe_price = '${price.id}',
      created_by_type = '${userType}',
      instructions = ${escapeText(data.instructions)},
      is_draft = '0',
      digital_price_type = ${data.digital_price_type ? `${digital_price_type}` : null}
    WHERE id = ${id}
  `;
  return new Promise((resolve, reject) => {
    db.query(updateDraftQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateAdvertismentById(query) {
  return new Promise((resolve, reject) => {
    db.query(query, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function deleteAdvertisementById(id) {
  const deleteAdvertisementQuery = `DELETE FROM advertisement where id = ${id}`;

  return new Promise((resolve, reject) => {
    db.query(deleteAdvertisementQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//dicounts query
export async function insertDiscounts(
  advertisementId,
  item,
  formattedCreatedAt
) {
  const discountQuery = `INSERT INTO discounts (
        advertisement_id,
        duration,
        discount,
        created_at
      ) VALUES (
        '${advertisementId}',
        ${item.duration},
        ${item.discount},
        '${formattedCreatedAt}'
      )
    `;
  return new Promise((resolve, reject) => {
    db.query(discountQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getDiscountsByAd(id) {
  const getDiscountsQuery = `SELECT * FROM discounts where advertisement_id = ${id}`;

  return new Promise((resolve, reject) => {
    db.query(getDiscountsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function deleteDiscountById(id) {
  const deleteAdvertisementQuery = `DELETE FROM discounts where id = ${id}`;

  return new Promise((resolve, reject) => {
    db.query(deleteAdvertisementQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getReviewsByListingId(id) {
  const getListingReviewsQuery = `SELECT sellers_ratings.*,
  users.name,
  users.profile_image,
  users.user_type,
  companies.company_name,
  companies.company_logo
  FROM sellers_ratings 
  JOIN users ON users.id = sellers_ratings.rated_by_id COLLATE utf8mb4_unicode_ci
  JOIN contracts ON contracts.id = sellers_ratings.contract_id COLLATE utf8mb4_unicode_ci
  LEFT JOIN companies ON companies.id = rated_by_company_id COLLATE utf8mb4_unicode_ci
  where sellers_ratings.advertisement_id = ${id} and contracts.is_rated_by_seller = 1 and contracts.is_rated_by_buyer = 1`;

  return new Promise((resolve, reject) => {
    db.query(getListingReviewsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getReviewsBySellerId(id,companyId) {
  const getListingReviewsQuery = `SELECT sellers_ratings.*,
  users.name,
  users.profile_image,
  users.user_type,
  companies.company_name,
  companies.company_logo
  FROM sellers_ratings 
  JOIN users ON users.id = sellers_ratings.rated_by_id COLLATE utf8mb4_unicode_ci
  JOIN contracts ON contracts.id = sellers_ratings.contract_id COLLATE utf8mb4_unicode_ci
  LEFT JOIN companies ON companies.id = rated_by_company_id COLLATE utf8mb4_unicode_ci
  where contracts.is_rated_by_seller = 1 and contracts.is_rated_by_buyer = 1 
  and sellers_ratings.seller_id = ${id} ${companyId ? `and company_id = ${companyId}` : ''}`;

  return new Promise((resolve, reject) => {
    db.query(getListingReviewsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getReviewsByBuyerId(id,companyId) {
  const getListingReviewsQuery = `SELECT buyers_ratings.*,
  users.name,
  users.profile_image,
  users.user_type,
  companies.company_name,
  companies.company_logo
  FROM buyers_ratings 
  JOIN users ON users.id = buyers_ratings.rated_by_id COLLATE utf8mb4_unicode_ci
  JOIN contracts ON contracts.id = buyers_ratings.contract_id COLLATE utf8mb4_unicode_ci
  LEFT JOIN companies ON companies.id = rated_by_company_id COLLATE utf8mb4_unicode_ci
  where contracts.is_rated_by_seller = 1 and contracts.is_rated_by_buyer = 1
  and buyers_ratings.buyer_id = ${id} ${companyId ? `and company_id = ${companyId}` : ''}`;

  return new Promise((resolve, reject) => {
    db.query(getListingReviewsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}


//expire listing queries
export async function getNearingExpiryListings() {
  const nearingExpiryListingsQuery = `
    SELECT advertisement.*,users.email
    FROM advertisement
    LEFT JOIN users ON users.id = advertisement.created_by COLLATE utf8mb4_unicode_ci
    where advertisement.ad_duration_type = '1' and advertisement.status = '1' and advertisement.end_date = CURDATE()
    `;
  return new Promise((resolve, reject) => {
    db.query(nearingExpiryListingsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getRecentExpiredListings() {
  const nearingExpiryListingsQuery = `
    SELECT advertisement.*,users.email
    FROM advertisement
    LEFT JOIN users ON users.id = advertisement.created_by COLLATE utf8mb4_unicode_ci
    where advertisement.ad_duration_type = '1' and advertisement.status = '1' and advertisement.end_date < CURDATE()
    `;
  return new Promise((resolve, reject) => {
    db.query(nearingExpiryListingsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}


export async function updateExpiredListingsStatus() {
  const updateExpiredListingsStatusQuery = `
  UPDATE advertisement
  SET status = '5'
  WHERE status = 1 AND ad_duration_type = '1' AND end_date < CURDATE();
`;

  return new Promise((resolve, reject) => {
    db.query(updateExpiredListingsStatusQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}