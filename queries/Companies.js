import database from ".././db.js";

export async function getCompaniesQuery(userId) {
  const getCompanies = `SELECT * FROM companies WHERE user_id = '${userId}'`;
  return new Promise((resolve, reject) => {
    database.query(getCompanies, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getCompanyQuery(id) {
  const getCompany = `SELECT * FROM companies WHERE id = '${id}'`;
  return new Promise((resolve, reject) => {
    database.query(getCompany, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function addCompanyImagesQuery(id,userId,images,imagesGroup) {
  
  const createdAt = new Date();
  const formattedUpdatedAt = createdAt
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");

  const addGalleryImage = `
  UPDATE adex.companies SET
    company_gallery = '${images ? images + ";" + imagesGroup : imagesGroup}',
    updated_at = '${formattedUpdatedAt}'
  WHERE user_id = ${userId} and id = ${id}
`;
  return new Promise((resolve, reject) => {
    database.query(addGalleryImage, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
