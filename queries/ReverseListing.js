import getDatabaseConnection from ".././db.js";
import escapeText from "../utils/escapeText.js";

const db = getDatabaseConnection();

export async function insertReverseListing(data,userId) {
  const insertReverseListingQuery = `
  INSERT INTO reverse_listing (
    user_id,
    category_id,
    title,
    address,
    latitude,
    longitude,
    description,
    sub_asset_type,
    media_types
  ) VALUES (
    '${userId}',
    '${data.category_id}',
    ${escapeText(data.title)},
    ${escapeText(data.address)},
    '${data.latitude}',
    '${data.longitude}',
    ${escapeText(data.description)},
    '${data.sub_asset_type}',
    '${data.media_types}'
  )
`;
  return new Promise((resolve, reject) => {
    db.query(insertReverseListingQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
