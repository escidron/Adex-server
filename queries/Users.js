import getDatabaseConnection from ".././db.js";
import escapeText from "../utils/escapeText.js";
import getFormattedDate from "../utils/getFormattedDate.js";

const db = getDatabaseConnection();

export async function insertUser(name, firstName, lastName, phone, email,accountType,hashedPass,token) {
  const createdAt = new Date();
  const formattedCreatedAt = getFormattedDate(createdAt);

  const insertUserQuery = `
    INSERT INTO users (
      name,
      first_name,
      last_name,
      mobile_number,
      email,
      user_type,
      password,
      created_at,
      verify_email_token
    ) VALUES (
      '${name}',
      '${firstName}',
      '${lastName}',
      '${phone}',
      '${email}',
      '${accountType}',
      '${hashedPass}',
      '${formattedCreatedAt}',
      '${token}'
    )
  `;
  return new Promise((resolve, reject) => {
    db.query(insertUserQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getUsersByEmail(email) {
  const usersQuery = `SELECT * FROM users WHERE email = '${email}'`;
  return new Promise((resolve, reject) => {
    db.query(usersQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getUsersById(id) {
  const usersQuery = `SELECT * FROM users WHERE id = '${id}'`;
  return new Promise((resolve, reject) => {
    db.query(usersQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getUsers() {
  const usersQuery = `SELECT * FROM users`;
  return new Promise((resolve, reject) => {
    db.query(usersQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//provably remove
export async function updateUserAddressInfo(
  idNumber,
  bod,
  street,
  city,
  state,
  zip,
  formattedUpdatedAt,
  id
) {
  const updateUserAddressQuery = `
    UPDATE users SET
      personal_id = '${idNumber}',
      birthdate = '${bod}',
      address1 = '${street}',
      city = '${city}',
      state = '${state}',
      postcode = '${zip}',
      updated_at = '${formattedUpdatedAt}'
    WHERE id = ${id}
  `;
  return new Promise((resolve, reject) => {
    db.query(updateUserAddressQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateProfileImage(imageName, id) {
  const updateProfileImageQuery = `UPDATE users set profile_image = '${imageName}' WHERE id = ${id}`;

  return new Promise((resolve, reject) => {
    db.query(updateProfileImageQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateEmailVerificationStatus(id,formattedUpdatedAt) {
  const updateEmailVerificationStatusQuery = `UPDATE users set email_verified_at = '${formattedUpdatedAt}' WHERE id = ${id}`;

  return new Promise((resolve, reject) => {
    db.query(updateEmailVerificationStatusQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updatePublicProfile(
  name,
  lastName,
  email,
  phone,
  bio,
  sex,
  handle,
  handleIsPublic,
  professionIsPublic,
  sexIsPublic,
  bioIsPublic,
  city,
  cityIsPublic,
  profession,
  id
) {
  const updatePublicProfileQuery = `UPDATE users set 
    name = '${name} ${lastName}', 
    first_name = '${name}', 
    last_name = '${lastName}', 
    email = '${email}', 
    mobile_number = '${phone}', 
    bio = "${bio ? bio : ''}" ,
    ${sex ? `sex = ${sex},`:''}
    handle = "${handle ? handle : ''}" ,
    handle_is_public = "${handleIsPublic}" ,
    profession_is_public = "${professionIsPublic}" ,
    sex_is_public = "${sexIsPublic}" ,
    bio_is_public = "${bioIsPublic}" ,
    city = "${city}" ,
    city_is_public = "${cityIsPublic}" ,
    profession = "${profession ? profession :''}" 
    WHERE id = ${id}`;

  return new Promise((resolve, reject) => {
    db.query(updatePublicProfileQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function resetUserPassword(hashedPass, email) {
  const updateUserPasswordQuery = `UPDATE users set 
    password = '${hashedPass}' 
    WHERE email = '${email}'`;
  return new Promise((resolve, reject) => {
    db.query(updateUserPasswordQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//seller queries
export async function getSeller(id,companyId) {
  const sellerQuery = `SELECT * FROM sellers WHERE user_id = '${id}' ${companyId ? `and company_id = ${companyId}` : ''}`;
  return new Promise((resolve, reject) => {
    db.query(sellerQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function insertSeller(id, stripeAccount, formattedCreatedAt,verifiedAccount,companyId) {
  const insertSellerQuery = `
    INSERT INTO sellers (
      user_id,
      stripe_account,
      verified_identity,
      created_at,
      company_id
    ) VALUES (
      '${id}',
      '${stripeAccount}',
      '${verifiedAccount }',
      '${formattedCreatedAt}',
      ${companyId ? companyId : null}
    )
  `;
  return new Promise((resolve, reject) => {
    db.query(insertSellerQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateSeller(userId, bankAccount, formattedCreatedAt, companyId) {
  const updateSellerQuery = `
  UPDATE sellers
  SET 
  updated_at = '${formattedCreatedAt}',
  external_account_id = '${bankAccount.id}'
  WHERE user_id = ${userId} ${companyId ? `and company_id = ${companyId}` : ''}
`;
  return new Promise((resolve, reject) => {
    db.query(updateSellerQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateSellerVerificationStatus(userId) {
  const updateSellerStatusQuery = `
  UPDATE sellers
  SET 
  verified_identity = '1'
  WHERE user_id = ${userId}
`;
  return new Promise((resolve, reject) => {
    db.query(updateSellerStatusQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
export async function updateSellerDueInfo(userId,accountId) {
  const updateSellerDueInfoQuery = `
  UPDATE sellers
  SET 
  due_info = null
  WHERE user_id = ${userId} and stripe_account = '${accountId}'
`;
  return new Promise((resolve, reject) => {
    db.query(updateSellerDueInfoQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
//Notifications queries
export async function insertUserNotifications(
  userId,
  header,
  message,
  createdAt,
  redirect,
  key
) {
  const insertNotificationQuery = `
  INSERT INTO notifications (
    user_id,
    header,
    message,
    created_at,
    redirect
    ${key ? ",notifications.key" : ""}
  ) VALUES (
    '${userId}',
    '${header}',
    '${message}',
    '${createdAt}',
    '${redirect}'
    ${key ? "," + key : ""}
    )
`;
  return new Promise((resolve, reject) => {
    db.query(insertNotificationQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getUserNotifications(id) {
  const userNotificationsQuery = `SELECT * FROM notifications WHERE user_id = '${id}' and readed = 0`;
  return new Promise((resolve, reject) => {
    db.query(userNotificationsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateNotificationStatus(notificationId, key) {
  let UpdateNotificationsQuery = "";

  if (key) {
    UpdateNotificationsQuery = `
    UPDATE notifications SET
      readed = '1'
    WHERE notifications.key = '${key}' and readed = '0'
  `;
  } else {
    UpdateNotificationsQuery = `
   UPDATE notifications SET
     readed = '1'
   WHERE id = '${notificationId}' and readed = '0'
 `;
  }
  return new Promise((resolve, reject) => {
    db.query(UpdateNotificationsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//contact us querie
export async function insertContactUs(
  name,
  email,
  number,
  message,
  formattedCreatedAt
) {
  const contactUsQuery = `
    INSERT INTO adex.contact_us (
      name,
      email,
      phone,
      message,
      created_at
    ) VALUES (
      '${name}',
      '${email}',
      '${number}',
      '${message}',
      '${formattedCreatedAt}'
    )`;
  return new Promise((resolve, reject) => {
    db.query(contactUsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//messages queries
export async function getAllMessages() {
  const allMessagesQuery = `SELECT * FROM messages`;

  return new Promise((resolve, reject) => {
    db.query(allMessagesQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function insertMessages( sended_by, seller_id, buyer_id, advertisement_id, message, formattedCreatedAt, filesNamesString) {
  const insertMessageQuery = `
  INSERT INTO messages (
    sended_by,
    seller_id,
    buyer_id,
    advertisement_id,
    message,
    created_at,
    files
  ) VALUES (
    '${sended_by}',
    '${seller_id}',
    '${buyer_id}',
    '${advertisement_id}',
    '${message}',
    '${formattedCreatedAt}',
    '${filesNamesString}'
  )
`;
  return new Promise((resolve, reject) => {
    db.query(insertMessageQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//chat queries
export async function getAllChatMessages(userId) {
  const messagesChatQuery = `SELECT m.*,a.image,a.title,a.description,a.price,a.address,a.ad_duration_type,a.created_by,a.id as advertisement_id,u.id as user_id,u.name,u.profile_image
  FROM messages as m
  JOIN advertisement as a ON m.advertisement_id = a.id COLLATE utf8mb4_unicode_ci
  JOIN users as u ON (u.id = m.seller_id or u.id = m.buyer_id) and u.id != ${userId} COLLATE utf8mb4_unicode_ci
  where m.seller_id = ${userId} or m.buyer_id = ${userId}
  order by m.created_at 
  `;
  return new Promise((resolve, reject) => {
    db.query(messagesChatQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//Buyers queries
export async function getBuyer(userId, companyId) {
  const getBuyerQuery = `SELECT * FROM adex.buyers where user_id = ${userId} ${companyId ? `and company_id = ${companyId}` : ''}`;

  return new Promise((resolve, reject) => {
    db.query(getBuyerQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateBuyer(userId, cardId, companyId) {
  const updatedAt = new Date();
  const formattedUpdatedAt = getFormattedDate(updatedAt);

  const updateBuyerQuery = `
        UPDATE adex.buyers
        SET default_card = '${cardId}',updated_at= '${formattedUpdatedAt}'
        WHERE user_id = ${userId} ${companyId ? `and company_id = ${companyId}` : ''}
      `;
  return new Promise((resolve, reject) => {
    db.query(updateBuyerQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function insertBuyer(
  userId,
  customer,
  fullName,
  email,
  cardId,
  formattedCreatedAt,
  companyId
) {
  const insertbuyerQuery = `
  INSERT INTO buyers (
    user_id,
    customer_id,
    name,
    email,
    created_at,
    default_card,
    company_id
  ) VALUES (
    '${userId}',
    '${customer.id}',
    '${fullName}',
    '${email}',
    '${formattedCreatedAt}',
    '${cardId}',
    ${companyId ? companyId : null}

  )
`;
  return new Promise((resolve, reject) => {
    db.query(insertbuyerQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}



export async function updateGalleryImage(images,userId) {
  const updategalleryImageQuery = `
  UPDATE users
  SET 
  image_gallery = '${images}'
  WHERE id = ${userId}
`;
  return new Promise((resolve, reject) => {
    db.query(updategalleryImageQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function deleteGalleryImage(imageName,userId) {
  const deleteGalleryImageQuery = `
  UPDATE users
  SET 
  image_gallery = REPLACE(REPLACE(image_gallery, ';${imageName}', ''), '${imageName}', '')
  WHERE id = ${userId}
`;
  return new Promise((resolve, reject) => {
    db.query(deleteGalleryImageQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}





  //rating queries
  export async function getUserRating(id) {
    const getUserRatingQuery = `SELECT rating,user_type FROM users where id = ${id}`;
  
    return new Promise((resolve, reject) => {
      db.query(getUserRatingQuery, (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }

  export async function getCompanyRating(id,companyId) {
    const getCompanyRatingQuery = `SELECT rating FROM companies where user_id = ${id} and id = ${companyId}`;
  
    return new Promise((resolve, reject) => {
      db.query(getCompanyRatingQuery, (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }

  export async function getBuyerRating(id,companyId) {
    const getUserRatingQuery = `SELECT rating FROM buyers_ratings where buyer_id = ${id} ${companyId ? `and company_id = ${companyId}` : ''}`;
  
    return new Promise((resolve, reject) => {
      db.query(getUserRatingQuery, (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }

  export async function insertBuyerRating(
    buyerId,
    companyId,
    contract,
    comments,
    rating
  ) {
    const insertRatingBuyerQuery = `INSERT INTO buyers_ratings (
          buyer_id,
          company_id,
          rated_by_id,
          rated_by_company_id,
          comments,
          rating,
          contract_id
        ) VALUES (
          ${buyerId},
          ${companyId ? companyId : null},
          ${contract.seller_id},
          ${contract.seller_company_id ? contract.seller_company_id : null},
          '${comments}',
          ${rating},
          ${contract.id}
        )
      `;
    return new Promise((resolve, reject) => {
      db.query(insertRatingBuyerQuery, (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }


  export async function updateUserRating(id,rating) {
  const updateUserRatingQuery = `
  UPDATE users
  SET 
  rating = ${rating}
  WHERE id = ${id}
`;
  return new Promise((resolve, reject) => {
    db.query(updateUserRatingQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
  export async function updateCompanyRating(id,companyId,rating) {
  const updateCompanyRatingQuery = `
  UPDATE companies
  SET 
  rating = ${rating}
  WHERE user_id = ${id} and id = ${companyId}
`;
  return new Promise((resolve, reject) => {
    db.query(updateCompanyRatingQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//seller rating queries
export async function getSellersRating(id,companyId) {
  const getUserRatingQuery = `SELECT rating,advertisement_id FROM sellers_ratings where seller_id = ${id} ${companyId ? `and company_id = ${companyId}` : ''}`;

  return new Promise((resolve, reject) => {
    db.query(getUserRatingQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function insertSellerRating(
  sellerId,
  companyId,
  contract,
  comments,
  rating
) {
  const insertRatingSellerQuery = `INSERT INTO sellers_ratings (
        seller_id,
        company_id,
        rated_by_id,
        rated_by_company_id,
        comments,
        rating,
        contract_id,
        advertisement_id
      ) VALUES (
        ${sellerId},
        ${companyId ? companyId : null},
        ${contract.buyer_id},
        ${contract.buyer_company_id ? contract.buyer_company_id : null},
        ${escapeText(comments)},
        ${rating},
        ${contract.id},
        ${contract.advertisement_id}
      )
    `;
  return new Promise((resolve, reject) => {
    db.query(insertRatingSellerQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}


export async function updateListingRate(id,rating) {
  const rateFinishedListingQuery = `
  UPDATE advertisement
  SET 
  rating = ${rating},
  amount_reviews = COALESCE(amount_reviews, 0) + 1
  WHERE id = ${id}
`;
  return new Promise((resolve, reject) => {
    db.query(rateFinishedListingQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function addPlataformsAndFollowers(userId,plataform,followers) {
  const addPlataformsAndFollowersQuery = `
  UPDATE users
  SET 
  plataforms = IF(plataforms IS NOT NULL, CONCAT(plataforms, "${plataform};"), "${plataform};"),
  followers = IF(followers IS NOT NULL, CONCAT(followers, "${followers};"), "${followers};")
  WHERE id = ${userId}
`;
  return new Promise((resolve, reject) => {
    db.query(addPlataformsAndFollowersQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function addPreference(userId,preference) {
  const addAudiencePreferencesQuery = `
  UPDATE users
  SET 
  audience_preference = IF(audience_preference IS NOT NULL, CONCAT(audience_preference, "${preference};"), "${preference};")
  WHERE id = ${userId}
`;
  return new Promise((resolve, reject) => {
    db.query(addAudiencePreferencesQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
export async function removePlataformAndFollowers(userId,plataforms,followers) {
  const removePlataformQuery = `
  UPDATE users
  SET 
  plataforms = '${plataforms}',
  followers = '${followers}'
  WHERE id = ${userId}
`;
  return new Promise((resolve, reject) => {
    db.query(removePlataformQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
export async function removePreference(userId,preference) {
  const addAudiencePreferencesQuery = `
  UPDATE users
  SET 
  audience_preference = REPLACE(audience_preference, '${preference};', '')
  WHERE id = ${userId}
`;
  return new Promise((resolve, reject) => {
    db.query(addAudiencePreferencesQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function setIsContentCreatorById(userId,isContentCreator) {
  const setIsContentCreatorQuery = `UPDATE users set 
    is_content_creator = '${isContentCreator ? '1' : '0'}' 
    WHERE id = '${userId}'`;
  return new Promise((resolve, reject) => {
    db.query(setIsContentCreatorQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//return connect seller account with rejected status
export async function getRejectedAccounts() {
  const sgetRejectedAccountsQuery = `SELECT * FROM sellers where 
    isAccepted = '0'`;
  return new Promise((resolve, reject) => {
    db.query(sgetRejectedAccountsQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//update connect seller account status
export async function setAccountIsAccepted(account) {
  const setAccountIsAcceptedQuery = `UPDATE sellers set 
    isAccepted = '1' 
    WHERE stripe_account = '${account}'`;
  return new Promise((resolve, reject) => {
    db.query(setAccountIsAcceptedQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

//update connect seller account status
export async function addDueInfo(account,dueInfo) {
  const addDueInfoQuery = `UPDATE sellers set 
    due_info = '${dueInfo}'
    WHERE stripe_account = '${account}'`;
  return new Promise((resolve, reject) => {
    db.query(addDueInfoQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}