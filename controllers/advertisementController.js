import asyncHandler from "express-async-handler";
import database from ".././db.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";
import jwt from "jsonwebtoken";
import pkg from "based-blob";
import * as fs from "fs";
import Stripe from "stripe";
import getImageBase64 from "../utils/getImageBase64.js";

const getAdvertisement = asyncHandler(async (req, res) => {
  console.log("entrouuuu");
  const token = req.cookies.jwt;
  const { radius, type, adGroup, priceMin, priceMax } = req.body;
  if (token) {
    try {
      const sql = `SELECT * FROM adax.advertisement where price BETWEEN ${
        priceMin != "" ? priceMin : 0
      } AND ${priceMax != "" ? priceMax : 0} ${
        type ? "and ad_type=" + type : ""
      } ${adGroup ? "and ad_group=" + adGroup : ""}`;
      database.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          throw err;
        }
        if (result.length == 0) {
          console.log("no add");
          res.status(200).json({
            data: [],
          });
        } else {
          console.log("xxxx");
          const advertisementsWithImages = result.map((ad) => ({
            ...ad,
            image: getImageBase64(ad), // Assuming 'imagePath' is the column name in the database storing the image path
          }));
          res.status(200).json({
            data: advertisementsWithImages,
          });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(401).json({
        error: "Not authorized, token failed",
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const getMyAdvertisement = asyncHandler(async (req, res) => {
  console.log("entrou na rota");
  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("entro no try");
      const sql = `SELECT * FROM adax.advertisement where created_by = ${decoded.userId}`;
      database.query(sql, (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
          res.status(401).json({
            error: "Advertisement does not exists",
          });
        } else {
          console.log("result", result);

          // Add base64 image to each advertisement object
          const advertisementsWithImages = result.map((ad) => ({
            ...ad,
            image: getImageBase64(ad), // Assuming 'imagePath' is the column name in the database storing the image path
          }));
          const status = {
            available: 0,
            running: 0,
            finished: 0,
            pending: 0,
          };
          advertisementsWithImages.map((item) => {
            if (item.status == "1") {
              status.available++;
            } else if (item.status == "2") {
              status.running++;
            }else if (item.status == "3") {
              status.finished++;
            }else if (item.status == "4") {
              status.pending++;
            }
          });

          res.status(200).json({
            data: advertisementsWithImages,
            status
          });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(401).json({
        error: "Not authorized, token failed",
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});
const getMyBookings = asyncHandler(async (req, res) => {
  console.log("entrou na rota getMyBookings");
  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const sql = `
      SELECT *
      FROM contracts
      JOIN buyers ON contracts.buyer_id = buyers.customer_id COLLATE utf8mb4_unicode_ci
      JOIN advertisement ON advertisement.id = contracts.advertisement_id COLLATE utf8mb4_unicode_ci
      where buyers.user_id = ${decoded.userId}
      `;
      database.query(sql, (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
          res.status(401).json({
            error: "Advertisement does not exists",
          });
        } else {
          console.log("result", result);

          // Add base64 image to each advertisement object
          const advertisementsWithImages = result.map((ad) => ({
            ...ad,
            image: getImageBase64(ad), // Assuming 'imagePath' is the column name in the database storing the image path
          }));
          res.status(200).json({
            data: advertisementsWithImages,
          });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(401).json({
        error: "Not authorized, token failed",
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const createAdvertisement = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const data = req.body;
  console.log("linha 91");
  console.log(data);

  const createdAt = new Date();
  // Format the createdAt value to match MySQL's datetime format
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  const parsedValue = parseFloat(data.price.replace(/,/g, ""));

  const imageName = Date.now() + ".png";
  const path = "./images/" + imageName;
  const imgdata = data.image;

  // to convert base64 format into random filename
  const base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");

  fs.writeFileSync(path, base64Data, { encoding: "base64" });
  // console.log("dataimage", imageName);

  //calculate end date
  // let startDate = data.start_date;
  // startDate = new Date(startDate.substring(0, 10));
  // let endDate = new Date(startDate);
  // if (data.ad_duration_type == "1") {
  //   endDate.setMonth(startDate.getMonth() + data.duration);
  // } else if (data.ad_duration_type == "2") {
  //   endDate.setMonth(startDate.getMonth() + data.duration * 3);
  // } else if (data.ad_duration_type == "3") {
  //   endDate.setFullYear(startDate.getFullYear() + data.duration);
  // }
  // endDate = endDate.toISOString().substring(0, 10);
  // console.log('endDate',endDate)

  const product = await stripe.products.create({
    name: data.title,
  });

  console.log("product", product);
  const price = await stripe.prices.create({
    unit_amount: parseInt(data.price) * 100,
    currency: "USD",
    recurring: {
      interval:
        data.ad_duration_type === "0" ||
        data.ad_duration_type === "1" ||
        data.ad_duration_type === "2"
          ? "month"
          : "year",
      interval_count: data.ad_duration_type === "2" ? 3 : 1,
    },

    product: product.id,
  });

  // console.log("price", price);

  console.log("product.id", product.id);
  console.log("price.id", price.id);
  const query = `
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
      is_automatic
    ) VALUES (
      '${data.category_id}',
      '${userId}',
      '${data.title}',
      '${data.description}',
      '${parsedValue}',
      '${imageName}',
      '${data.address}',
      '${data.lat}',
      '${data.long}',
      '${data.ad_duration_type ? data.ad_duration_type : 0}',
      '1',
      '${formattedCreatedAt}',
      '${data.sub_asset_type}',
      '${data.units}',
      '${data.per_unit_price}',
      '${product.id}',
      '${price.id}',
      '${data.is_automatic}'

    )
  `;
  console.log("query", query);
  database.query(query, (err, results) => {
    if (err) {
      console.log("Error saving datarmation to MySQL database:", err);
      res.status(500).json({
        error: "An error occurred while saving the datarmation.",
      });
      return;
    }

    res.status(200).json({
      message: "data saved successfully.",
    });
  });
});

const updateAdvertisement = asyncHandler(async (req, res) => {
  const data = req.body;
  const updatedAt = new Date();
  const formattedUpdatedAt = updatedAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const query = `
    UPDATE advertisement SET
      category_id = '${data.category_id}',
      created_by = '${data.created_by}',
      title = '${data.title}',
      description = '${data.description}',
      price = '${data.price}',
      image = '${data.image}',
      address = '${data.address}',
      lat = '${data.lat}',
      \`long\` = '${data.long}',
      ad_duration_type = '${data.ad_duration_type ? data.ad_duration_type : 0}',
      start_date = '${data.start_date}',
      end_date = '${data.end_date}',
      status = '1',
      updated_at = '${formattedUpdatedAt}'
    WHERE id = ${req.params.id}
  `;

  database.query(query, (err, results) => {
    if (err) {
      console.error("Error updating advertisement in MySQL database:", err);
      res
        .status(500)
        .json({ error: "An error occurred while updating the advertisement." });
      return;
    }

    res.status(200).json({ message: "Advertisement updated successfully." });
  });
});

const GetAdvertisementDetails = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    const sql = `SELECT * FROM adax.advertisement where id = ${id}`;
    database.query(sql, (err, result) => {
      if (err) throw err;
      console.log(result);

      // get the seller profile image
      const seller = result[0].created_by;
      const sql = `SELECT * FROM adax.users where id = ${seller}`;
      database.query(sql, (err, seller) => {
        if (err) throw err;

        let image = "";
        if (seller[0].profile_image) {
          const nameImage = {
            image: seller[0].profile_image,
          };
          image = getImageBase64(nameImage);
        }
        const advertisementWithImage = result.map((ad) => ({
          ...ad,
          image: getImageBase64(ad), // Assuming 'imagePath' is the column name in the database storing the image path
        }));
        res.status(200).json({
          data: {
            ...advertisementWithImage[0],
            seller_image: image,
            seller_name: seller[0].name,
          },
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({
      error: "Not authorized, token failed",
    });
  }
});

export {
  getAdvertisement,
  createAdvertisement,
  updateAdvertisement,
  getMyAdvertisement,
  GetAdvertisementDetails,
  getMyBookings,
};
