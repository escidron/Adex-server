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
  formattedCreatedAt,
  email = null,
  phone = null
) {
  const insertCompanyQuery = `
  INSERT INTO adex.companies (
    user_id,
    company_name,
    company_logo,
    address,
    industry,
    has_physical_space,
    email,
    phone,
    created_at
  ) VALUES (
    '${id}',
    '${name}',
    '${imageName}',
    '${address}',
    '${industry}',
    '${hasPhysicalSpace}',
    ${email ? `'${email}'` : 'NULL'},
    ${phone ? `'${phone}'` : 'NULL'},
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
  hasPhysicalSpace,
  email = null,
  phone = null
) {
  const editCompanyQuery = `
  UPDATE companies SET
  company_name = '${name}',
  company_logo = '${imageName}',
  address = '${hasPhysicalSpace == '2' ? address : ''}',
  industry = '${industry}',
  has_physical_space = '${hasPhysicalSpace}',
  email = ${email ? `'${email}'` : 'NULL'},
  phone = ${phone ? `'${phone}'` : 'NULL'},
  updated_at = NOW()
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

export async function saveInvoicePdf(companyId, campaignId, campaignName, pdfUrl, filename) {
  const createdAt = new Date();
  const formattedUpdatedAt = getFormattedDate(createdAt);

  const saveInvoiceQuery = `
    UPDATE companies SET
      invoices = JSON_ARRAY_APPEND(IFNULL(invoices, JSON_ARRAY()), '$', '${filename}'),
      updated_at = '${formattedUpdatedAt}'
    WHERE id = ${companyId}
  `;

  return new Promise((resolve, reject) => {
    db.query(saveInvoiceQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}

export async function getCompanyInvoices(companyId) {
  const getInvoicesQuery = `
    SELECT invoices FROM companies WHERE id = ${companyId}
  `;

  return new Promise((resolve, reject) => {
    db.query(getInvoicesQuery, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
