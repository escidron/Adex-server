import asyncHandler from "express-async-handler";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import * as fs from "fs";
import Stripe from "stripe";
import getImageBase64 from "../utils/getImageBase64.js";
import { getCompanyQuery, addGalleryImages } from "../queries/Companies.js";
import {
  getFilteredAdvertisements,
  getAdvertisementByCreater,
  getAdvertisementById,
  getAdvertisementAndBuyers,
  insertAdvertisement,
  insertDiscounts,
  updateAdvertismentById,
  getDiscountsByAd,
  deleteAdvertisementById,
} from "../queries/Advertisements.js";
import {
  updateNotificationStatus,
  getUsersById,
  getAllMessages,
  getAllChatMessages,
} from "../queries/Users.js";

dotenv.config();

const getAdvertisement = asyncHandler(async (req, res) => {
  const { type, adGroup, priceMin, priceMax } = req.body;

  let types = "";
  if (type == 1) {
    types = "4,5,6,7,8";
  } else if (type == 2) {
    types = "9,10,11,12";
  } else if (type == 3) {
    types = "17,18";
  }

  try {
    const result = await getFilteredAdvertisements(
      priceMin,
      priceMax,
      type,
      adGroup
    );
    if (result.length == 0) {
      res.status(200).json({
        data: [],
      });
    } else {
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
      res.status(200).json({
        data: advertisementsWithImages,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(401).json({
      error: "Not authorized, token failed",
    });
  }
});

const getMyAdvertisement = asyncHandler(async (req, res) => {
  const { id, notificationId } = req.body;
  const token = req.cookies.jwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const result = await getAdvertisementByCreater(userId, id);

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
          const results = await updateNotificationStatus(notificationId);
          const notifications = results.affectedRows;
          res.status(200).json({
            data: advertisementsWithImages,
            status,
            notifications,
          });
        } else {
          res.status(200).json({
            data: advertisementsWithImages,
            status,
          });
        }
      }
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
  const { id } = req.body;
  try {
    const result = await getAdvertisementById(id);
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
          shared_image: imageArray[0],
        };
      });
      res.status(200).json({
        data: advertisementsWithImages,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(401).json({
      error: "Not authorized, token failed",
    });
  }
});

const getMyBookings = asyncHandler(async (req, res) => {
  const { advertisementId, notificationId } = req.body;
  const token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      let result = "";
      if (advertisementId) {
        result = await getAdvertisementById(advertisementId);
      } else {
        result = await getAdvertisementAndBuyers(userId);
      }
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
        if (notificationId != undefined) {
          updateNotificationStatus(notificationId);
          res.status(200).json({
            data: advertisementsWithImages,
          });
        }
        res.status(200).json({
          data: advertisementsWithImages,
        });
      }
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

  const createdAt = new Date();
  // Format the createdAt value to match MySQL's datetime format
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  let startDateFormatted = "";
  if (data.start_date) {
    let startDate = new Date(data.start_date.substring(0, 10));
    startDateFormatted = startDate.toISOString().slice(0, 19).replace("T", " ");
  }

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  const parsedValue = parseFloat(data.price.replace(/,/g, ""));

  let images = "";
  const result = await getCompanyQuery(data.company_id);
  const user = await getUsersById(userId);
  const userImages = user[0].image_gallery;
  if (data.importFromGallery) {
    const imageArray = userImages.split(";");
    imageArray.map((image) => {
      if (image) {
        const base64Image = getImageBase64(image);
        data.images.map((item) => {
          if (item.data_url == base64Image) {
            images += image + ";";
          }
        });
      }
    });
    images = images.slice(0, -1);
  } else {
    data.images.map((image, index) => {
      let imageName = Date.now() + index + ".png";
      let path = "./images/" + imageName;
      let imgdata = image.data_url;
      images += imageName + ";";

      // to convert base64 format into random filename
      let base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");

      fs.writeFileSync(path, base64Data, { encoding: "base64" });
    });
    images = images.slice(0, -1);

    const imagesGroup = images;

    addGalleryImages("", userId, userImages, imagesGroup);

    if (data.company_id) {
      const id = data.company_id;
      addGalleryImages(id, userId, result[0].company_gallery, imagesGroup);
    }
  }

  const product = await stripe.products.create({
    name: data.title,
  });

  const price = await stripe.prices.create({
    unit_amount: parseInt(data.price) * 100,
    currency: "usd",
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
  const results = await getUsersById(userId);
  const userType = results[0].user_type;
  const newAdvertisement = await insertAdvertisement(
    data,
    userId,
    parsedValue,
    images,
    formattedCreatedAt,
    product,
    price,
    userType,
    startDateFormatted
  );

  const advertisementId = newAdvertisement.insertId;

  data.discounts.map((item) => {
    const createdAt = new Date();
    const formattedCreatedAt = createdAt
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    insertDiscounts(advertisementId, item, formattedCreatedAt);
  });
  res.status(200).json({
    message: "data saved successfully.",
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
    images += imageName + ";";

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
  updateAdvertismentById(query);
  res.status(200).json({ message: "Advertisement updated successfully." });
});

const GetAdvertisementDetails = asyncHandler(async (req, res) => {
  const { id, notificationId } = req.body;

  try {
    const result = await getAdvertisementById(id);
    const sellerId = result[0].created_by;
    const seller = await getUsersById(sellerId);
    let image = "";
    if (seller[0].profile_image) {
      image = getImageBase64(seller[0].profile_image);
    }

    const advertisementWithImage = result.map((advertisement) => {
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

    if (notificationId) {
      updateNotificationStatus(notificationId);
      res.status(200).json({
        data: {
          ...advertisementWithImage[0],
          seller_image: image,
          seller_name: seller[0].name,
        },
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
      const result = await getAllMessages();
      res.status(200).json({
        messages: result,
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
  const { key } = req.body;
  const token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      // const messagesQuery = `SELECT * FROM messages`;
      const messages = await getAllChatMessages(userId);
      const results = await updateNotificationStatus("", key);

      const notifications = results.affectedRows;
      const messagesWithImage = messages.map((advertisement) => {
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
      res.status(200).json({
        messages: messagesWithImage,
        notifications: notifications,
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
      const result = await getDiscountsByAd(id);
      res.status(200).json({
        discounts: result,
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
    deleteAdvertisementById(id);
    res.status(200).json({
      message: "advertisement deleted successfully",
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
  getSharedListing,
};
