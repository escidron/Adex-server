import getDatabaseConnection from ".././db.js";
import getFormattedDate from "../utils/getFormattedDate.js";

const db = getDatabaseConnection();

export async function insertCompany(
  id,
  name,
  imageName,
  address,
  industry,
  hasPhysicalSpace,
  formattedCreatedAt
) {
  const insertCompanyQuery = `
  INSERT INTO adex.companies (
    user_id,
    company_name,
    company_logo,
    address,
    industry,
    has_physical_space,
    created_at
  ) VALUES (
    '${id}',
    '${name}',
    '${imageName}',
    '${address}',
    '${industry}',
    '${hasPhysicalSpace}',
    '${formattedCreatedAt}'
  )
`;
  return new Promise((resolve, reject) => {
    db.query(insertCompanyQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function editCompanyById(
  id,
  userId,
  name,
  imageName,
  address,
  industry,
  hasPhysicalSpace
) {
  const editCompanyQuery = `

  UPDATE companies SET
  company_name = '${name}',
  company_logo = '${imageName}',
  address = '${hasPhysicalSpace == '2' ? address : ''}',
  industry = '${industry}',
  has_physical_space = '${hasPhysicalSpace}'
  WHERE id = ${id} and user_id = ${userId}
`;
  return new Promise((resolve, reject) => {
    db.query(editCompanyQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getCompaniesQuery(userId) {
  const getCompanies = `SELECT * FROM companies WHERE user_id = '${userId}'`;
  return new Promise((resolve, reject) => {
    db.query(getCompanies, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getCompaniesById(id) {
  const getCompanyQuery = `SELECT * FROM companies WHERE id = '${id}'`;
  return new Promise((resolve, reject) => {
    db.query(getCompanyQuery, (err, result) => {
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
    db.query(getCompany, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function removeCompanyById(id) {
  const removeComanyQuery = `DELETE FROM companies where id = ${id}`;

  return new Promise((resolve, reject) => {
    db.query(removeComanyQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function addGalleryImages(id, userId, images, imagesGroup) {
  const createdAt = new Date();
  const formattedUpdatedAt = getFormattedDate(createdAt);

  let addGalleryImageQuery = "";
  if (id) {
    addGalleryImageQuery = `
    UPDATE adex.companies SET
      company_gallery = '${images ? images + ";" + imagesGroup : imagesGroup}',
      updated_at = '${formattedUpdatedAt}'
    WHERE user_id = ${userId} and id = ${id}
    `;
  } else {
    addGalleryImageQuery = `
    UPDATE adex.users SET
      image_gallery = '${images ? images + ";" + imagesGroup : imagesGroup}',
      updated_at = '${formattedUpdatedAt}'
    WHERE  id = ${userId}
    `;
  }
  return new Promise((resolve, reject) => {
    db.query(addGalleryImageQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
