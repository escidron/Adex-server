import asyncHandler from "express-async-handler";
import database from ".././db.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";
import jwt from "jsonwebtoken";
import pkg from "based-blob";
import * as fs from "fs";
import Stripe from "stripe";
import getImageBase64 from "../utils/getImageBase64.js";
import {getCompanyQuery,addCompanyImagesQuery} from "../queries/Companies.js";

const getAdvertisement = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { radius, type, adGroup, priceMin, priceMax } = req.body;

  let types = "";
  if (type == 1) {
    types = "4,5,6,7,8";
  } else if (type == 2) {
    types = "9,10,11,12";
  } else if (type == 3) {
    types = "17,18";
  }

  //if (token) {
    try {
      const sql = `SELECT * FROM adex.advertisement where status <> '0' and price BETWEEN ${
        priceMin != "" ? priceMin : 0
      } AND ${priceMax != "" ? priceMax : 0} ${
        type != "" ? "and category_id IN (" + types + ")" : ""
      } ${adGroup != "" ? "and created_by_type=" + adGroup : ""}`;
      database.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          throw err;
        }
        if (result.length == 0) {
          res.status(200).json({
            data: [],
          });
        } else {
          
          
          const advertisementsWithImages = result.map((advertisement) => {
            const images = [];
            
            const imageArray = advertisement.image.split(";");
            imageArray.map((image)=>{
                images.push({data_url:getImageBase64(image)})
            })
            return {
              ...advertisement,
              image: images,
            };
          });
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
  // } else {
  //   res.status(401).json({
  //     error: "Not authorized, no token",
  //   });
  // }
});

const getMyAdvertisement = asyncHandler(async (req, res) => {
  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, 'usersecrettoken');
  const userId = decoded.userId;
  const { id, notificationId } = req.body;
  if (token) {
    try {
      const sql = `SELECT * FROM adex.advertisement where created_by = ${userId} ${
        id ? "and id=" + id : ""
      }`;
      database.query(sql, (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
          res.status(401).json({
            error: "Advertisement does not exists",
          });
        } else {
          // Add base64 image to each advertisement object

          const advertisementsWithImages = result.map((advertisement) => {
            const images = [];
            
            const imageArray = advertisement.image.split(";");
            imageArray.map((image)=>{
                images.push({data_url:getImageBase64(image)})
            })
            return {
              ...advertisement,
              image: images,
            };
          });
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
            } else if (item.status == "3") {
              status.finished++;
            } else if (item.status == "4") {
              status.pending++;
            }
          });

          if (notificationId != undefined) {
            const UpdateNotifications = `
            UPDATE notifications SET
              readed = '1'
            WHERE id = '${notificationId}' and readed = '0'
          `;
            database.query(UpdateNotifications, (err, results) => {
              if (err) {
                console.error(
                  "Error updating advertisement in MySQL database:",
                  err
                );
                res.status(500).json({
                  error: "An error occurred while updating the advertisement.",
                });
                return;
              }
              const notifications = results.affectedRows;
              res.status(200).json({
                data: advertisementsWithImages,
                status,
                notifications,
              });
            });
          } else {
            res.status(200).json({
              data: advertisementsWithImages,
              status,
            });
          }
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

const getSharedListing = asyncHandler(async (req, res) => {
  //get user id
  console.log("no tokenn");
  const { id } = req.body;
  try {
    const sql = `SELECT * FROM adex.advertisement where id = ${id}`;
    database.query(sql, (err, result) => {
      if (err) throw err;
      if (result.length == 0) {
        res.status(401).json({
          error: "Advertisement does not exists",
        });
      } else {
        // Add base64 image to each advertisement object

        const advertisementsWithImages = result.map((advertisement) => {
          const images = [];

          const imageArray = advertisement.image.split(";");
          imageArray.map((image) => {
            images.push({ data_url: getImageBase64(image) });
          });
          return {
            ...advertisement,
            image: images,
          };
        });
        console.log('taaa',advertisementsWithImages)
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
});

const getMyBookings = asyncHandler(async (req, res) => {
  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, 'usersecrettoken');
  const userId = decoded.userId;
  const { advertisementId, notificationId } = req.body;

  if (token) {
    try {
      let sql = "";
      if (advertisementId) {
        sql = `
        SELECT * from advertisement where id = ${advertisementId}`;
      } else {
        sql = `
        SELECT *
        FROM contracts
        JOIN buyers ON contracts.buyer_id = buyers.customer_id COLLATE utf8mb4_unicode_ci
        JOIN advertisement ON advertisement.id = contracts.advertisement_id COLLATE utf8mb4_unicode_ci
        where buyers.user_id = ${userId} 
        `;
      }
      database.query(sql, (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
          res.status(401).json({
            error: "Advertisement does not exists",
          });
        } else {
          // Add base64 image to each advertisement object

          const advertisementsWithImages = result.map((advertisement) => {
            const images = [];
            
            const imageArray = advertisement.image.split(";");
            imageArray.map((image)=>{
                images.push({data_url:getImageBase64(image)})
            })
            return {
              ...advertisement,
              image: images,
            };
          });
          if (notificationId != undefined) {
            const UpdateNotifications = `
            UPDATE notifications SET
              readed = '1'
            WHERE id = '${notificationId}' and readed = '0'
            `;
            database.query(UpdateNotifications, (err, results) => {
              if (err) {
                console.error(
                  "Error updating advertisement in MySQL database:",
                  err
                );
                res.status(500).json({
                  error: "An error occurred while updating the advertisement.",
                });
                return;
              }
              const notifications = results.affectedRows;
              res.status(200).json({
                data: advertisementsWithImages,
              });
            });
          }
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
  const stripe = new Stripe('sk_test_51Hz3inL3Lxo3VPLop5yMlq0Ov3D9Az2pTd8KJoj6h6Kk6PxFa08IwdTYhP0oa1Ag4aijQNRqWaDicDawyaAYRbTm00imWxlHre');
  const data = req.body;

  const createdAt = new Date();
  // Format the createdAt value to match MySQL's datetime format
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, 'usersecrettoken');
  const userId = decoded.userId;
  const parsedValue = parseFloat(data.price.replace(/,/g, ""));

  let images = "";
  const result = await getCompanyQuery(data.company_id)
  
  if(data.importFromGallery){
    const imageArray = result[0].company_gallery.split(";");
    imageArray.map((image) => {
      if(image){
        const base64Image = getImageBase64(image);
        data.images.map((item)=>{
          if(item.data_url == base64Image){
            images += image+';'

          }
        })
      }
    });
    images = images.slice(0, -1);
  }else{
    data.images.map((image, index) => {
      let imageName = Date.now() + index + ".png";
      let path = "./images/" + imageName;
      let imgdata = image.data_url;
      images += imageName+';'
  
      // to convert base64 format into random filename
      let base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");
  
      fs.writeFileSync(path, base64Data, { encoding: "base64" });
    });
    images = images.slice(0, -1);

    if(result[0]){
      const imagesGroup = images
      const id = data.company_id
      addCompanyImagesQuery(id,userId,result[0].company_gallery,imagesGroup)
    }
  }
  const product = await stripe.products.create({
    name: data.title,
  });

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
  //get user type
  const userQuery = `SELECT * FROM adex.users where id = ${userId}`;
  database.query(userQuery, (err, results) => {
    if (err) {
      console.log("Error saving datarmation to MySQL database:", err);
      res.status(500).json({
        error: "An error occurred while saving the datarmation.",
      });
      return;
    }
    const userType = results[0].user_type;
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
      is_automatic,
      created_by_type,
      company_id
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
      '${data.has_payout ? '1': '0'}',
      '${formattedCreatedAt}',
      '${data.sub_asset_type}',
      '${data.units}',
      '${data.per_unit_price}',
      '${product.id}',
      '${price.id}',
      '${data.is_automatic}',
      '${userType}',
      '${data.company_id}'
    )
  `;
    database.query(query, (err, results) => {
      if (err) {
        console.log("Error saving datarmation to MySQL database:", err);
        res.status(500).json({
          error: "An error occurred while saving the datarmation.",
        });
        return;
      }
      const advertisementId = results.insertId;

      data.discounts.map((item) => {
        const createdAt = new Date();
        const formattedCreatedAt = createdAt
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

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
        database.query(discountQuery, (err, results) => {
          if (err) {
            console.error(
              "Error updating advertisement in MySQL database:",
              err
            );
            res.status(500).json({
              error: "An error occurred while updating the advertisement.",
            });
          }
        });
      });
      res.status(200).json({
        message: "data saved successfully.",
      });
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

    let images = "";
    data.images.map((image, index) => {
      let imageName = Date.now() + index + ".png";
      let path = "./images/" + imageName;
      let imgdata = image.data_url;
      images += imageName+';'
  
      // to convert base64 format into random filename
      let base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");
  
      fs.writeFileSync(path, base64Data, { encoding: "base64" });
    });
    images = images.slice(0, -1);
  

  const query = `
    UPDATE advertisement SET
      title = '${data.title}',
      description = '${data.description}',
      price = '${data.price}',
      image = '${images}',
      address = '${data.address}',
      lat = '${data.lat}',
      \`long\` = '${data.long}',
      ad_duration_type = '${data.ad_duration_type ? data.ad_duration_type : 0}',
      updated_at = '${formattedUpdatedAt}',
      is_automatic = '${data.is_automatic}'
    WHERE id = ${data.id}
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
  const { id, notificationId } = req.body;

  try {
    const sql = `SELECT * FROM adex.advertisement where id = ${id}`;
    database.query(sql, (err, result) => {
      if (err) throw err;
      // get the seller profile image
      const seller = result[0].created_by;
      const sql = `SELECT * FROM adex.users where id = ${seller}`;
      database.query(sql, (err, seller) => {
        if (err) throw err;

        let image = "";
        if (seller[0].profile_image) {
          image = getImageBase64(seller[0].profile_imageImage);
        }
                 
        const advertisementWithImage = result.map((advertisement) => {
          const images = [];
          
          const imageArray = advertisement.image.split(";");
          imageArray.map((image)=>{
              images.push({data_url:getImageBase64(image)})
          })
          return {
            ...advertisement,
            image: images,
          };
        });

        if (notificationId) {
          const UpdateNotifications = `
          UPDATE notifications SET
            readed = '1'
          WHERE id = '${notificationId}' and readed = '0'
          `;
          database.query(UpdateNotifications, (err, results) => {
            if (err) {
              console.error(
                "Error updating advertisement in MySQL database:",
                err
              );
              res.status(500).json({
                error: "An error occurred while updating the advertisement.",
              });
              return;
            }
            const notifications = results.affectedRows;
            res.status(200).json({
              data: {
                ...advertisementWithImage[0],
                seller_image: image,
                seller_name: seller[0].name,
              },
            });
          });
        } else {

          res.status(200).json({
            data: {
              ...advertisementWithImage[0],
              seller_image: image,
              seller_name: seller[0].name,
            },
          });
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({
      error: "Not authorized, token failed",
    });
  }
});

const getMessages = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    try {
      const sql = `SELECT * FROM messages`;
      database.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json({
          messages: result,
        });
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

const getChatInfo = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, 'usersecrettoken');
  const userId = decoded.userId;
  const { key } = req.body;

  if (token) {
    try {
      // const messagesQuery = `SELECT * FROM messages`;
      const messagesQuery = `SELECT m.*,a.image,a.title,a.description,a.price,a.address,a.ad_duration_type,a.created_by,a.id as advertisement_id,u.id as user_id,u.name
      FROM messages as m
      JOIN advertisement as a ON m.advertisement_id = a.id COLLATE utf8mb4_unicode_ci
      JOIN users as u ON (u.id = m.seller_id or u.id = m.buyer_id) and u.id != ${userId} COLLATE utf8mb4_unicode_ci
      where m.seller_id = ${userId} or m.buyer_id = ${userId}
      order by m.created_at 
      `;
      database.query(messagesQuery, (err, messages) => {
        if (err) throw err;

        const UpdateNotifications = `
        UPDATE notifications SET
          readed = '1'
        WHERE notifications.key = '${key}' and readed = '0'
      `;
        database.query(UpdateNotifications, (err, results) => {
          if (err) {
            console.error(
              "Error updating advertisement in MySQL database:",
              err
            );
            res.status(500).json({
              error: "An error occurred while updating the advertisement.",
            });
            return;
          }
          const notifications = results.affectedRows;
          const messagesWithImage = messages.map((advertisement) => {
            const images = [];
            const imageArray = advertisement.image.split(";");
            imageArray.map((image)=>{
                images.push({data_url:getImageBase64(image)})
            })
            return {
              ...advertisement,
              image: images,
            };
          });
          res.status(200).json({
            messages: messagesWithImage,
            notifications: notifications,
          });
        });
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

const getDiscounts = asyncHandler(async (req, res) => {
  const { id } = req.body;
  const token = req.cookies.jwt;
  if (token) {
    try {
      const sql = `SELECT * FROM discounts where advertisement_id = ${id}`;
      database.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json({
          discounts: result,
        });
      });
    } catch (error) {
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

const DeleteAdvertisment = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    const sql = `DELETE FROM advertisement where id = ${id}`;
    database.query(sql, (err, result) => {
      if (err) throw err;
      // get the seller profile image
      res.status(200).json({
        message: "advertisement deleted successfully",
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
  getMessages,
  getChatInfo,
  DeleteAdvertisment,
  getDiscounts,
  getSharedListing
};
