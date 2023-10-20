import getDatabaseConnection from ".././db.js";

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
    type != "" ? "and category_id IN (" + types + ")" : ""
  } ${adGroup != "" ? "and created_by_type=" + adGroup : ""}`;
  return new Promise((resolve, reject) => {
    db.query(FilteredAdvertisementsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getAdvertisementByCreator(userId, id) {
  const advertisementByCreateorQuery = `SELECT * FROM adex.advertisement where created_by = ${userId} ${
    id ? "and id=" + id : ""
  }`;
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

export async function getAdvertisementAndBuyers(userId) {
  const advertisementAndBuyersQuery = `
    SELECT *
    FROM contracts
    JOIN buyers ON contracts.buyer_id = buyers.customer_id COLLATE utf8mb4_unicode_ci
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
  startDateFormatted
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
      is_automatic,
      created_by_type,
      company_id
      ${data.start_date ? ',start_date':''}
    ) VALUES (
      '${data.category_id}',
      '${userId}',
      '${data.title}',
      '${data.description}',
      '${parsedValue}',
      '${images}',
      '${data.address}',
      '${data.lat}',
      '${data.long}',
      '${data.ad_duration_type ? data.ad_duration_type : 0}',
      '${data.has_payout ? "1" : "0"}',
      '${formattedCreatedAt}',
      '${data.sub_asset_type}',
      '${data.units}',
      '${data.per_unit_price}',
      '${product.id}',
      '${price.id}',
      '${data.is_automatic}',
      '${userType}',
      '${data.company_id}' 
      ${data.start_date ? `,'${startDateFormatted}'`: ''}
      
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