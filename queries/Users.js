import getDatabaseConnection from ".././db.js";

const db = getDatabaseConnection();

export async function insertUser(name, firstName, lastName, phone, email,accountType,hashedPass) {
  const createddAt = new Date();
  const formattedCreatedAt = createddAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const insertUserQuery = `
    INSERT INTO users (
      name,
      first_name,
      last_name,
      mobile_number,
      email,
      user_type,
      password,
      created_at
    ) VALUES (
      '${name}',
      '${firstName}',
      '${lastName}',
      '${phone}',
      '${email}',
      '${accountType}',
      '${hashedPass}',
      '${formattedCreatedAt}'
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
    bio = "${bio}" ,
    sex = "${sex}" ,
    handle = "${handle}" ,
    handle_is_public = "${handleIsPublic}" ,
    profession_is_public = "${professionIsPublic}" ,
    sex_is_public = "${sexIsPublic}" ,
    bio_is_public = "${bioIsPublic}" ,
    city = "${city}" ,
    city_is_public = "${cityIsPublic}" ,
    profession = "${profession}" 
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
export async function getSeller(id) {
  const sellerQuery = `SELECT * FROM sellers WHERE user_id = '${id}'`;
  return new Promise((resolve, reject) => {
    db.query(sellerQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function insertSeller(id, stripeAccount, formattedCreatedAt) {
  const insertSellerQuery = `
    INSERT INTO sellers (
      user_id,
      stripe_account,
      created_at
    ) VALUES (
      '${id}',
      '${stripeAccount}',
      '${formattedCreatedAt}'
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

export async function updateSeller(userId, bankAccount, formattedCreatedAt) {
  const updateSellerQuery = `
  UPDATE sellers
  SET 
  updated_at = '${formattedCreatedAt}',
  external_account_id = '${bankAccount.id}'
  WHERE user_id = ${userId}
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

export async function insertMessages(data, formattedCreatedAt) {
  const insertMessageQuery = `
  INSERT INTO messages (
    sended_by,
    seller_id,
    buyer_id,
    advertisement_id,
    message,
    created_at
  ) VALUES (
    '${data.sended_by}',
    '${data.seller_id}',
    '${data.buyer_id}',
    '${data.advertisement_id}',
    '${data.message}',
    '${formattedCreatedAt}'
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
  const messagesChatQuery = `SELECT m.*,a.image,a.title,a.description,a.price,a.address,a.ad_duration_type,a.created_by,a.id as advertisement_id,u.id as user_id,u.name
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
export async function getBuyer(userId) {
  const getBuyerQuery = `SELECT * FROM adex.buyers where user_id = ${userId}`;

  return new Promise((resolve, reject) => {
    db.query(getBuyerQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function updateBuyer(userId, cardId) {
  const updatedAt = new Date();
  const formattedUpdatedAt = updatedAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const updateBuyerQuery = `
        UPDATE adex.buyers
        SET default_card = '${cardId}',updated_at= '${formattedUpdatedAt}'
        WHERE user_id = ${userId}
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
  formattedCreatedAt
) {
  const insertbuyerQuery = `
  INSERT INTO buyers (
    user_id,
    customer_id,
    name,
    email,
    created_at,
    default_card
  ) VALUES (
    '${userId}',
    '${customer.id}',
    '${fullName}',
    '${email}',
    '${formattedCreatedAt}',
    '${cardId}'

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
