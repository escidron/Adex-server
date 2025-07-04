import asyncHandler from "express-async-handler";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import * as fs from "fs";
import Stripe from "stripe";
import {
  getCompanyQuery,
  addGalleryImages,
  getCompaniesById,
} from "../queries/Companies.js";
import {
  getFilteredAdvertisements,
  getAdvertisementByCreator,
  getAdvertisementById,
  getAdvertisementAndBuyers,
  insertAdvertisement,
  insertDiscounts,
  updateAdvertismentById,
  getDiscountsByAd,
  deleteAdvertisementById,
  insertDraft,
  getDraftByUserId,
  getParentCategoryId,
  updateDraft,
  DraftToAdvertisement,
  deleteDiscountById,
  getAllAdvertisements,
  getPendingBookings,
  getReviewsByListingId,
  getReviewsBySellerId,
  getReviewsByBuyerId,
  insertCampaign,
  getCampaignSubscribersList,
  insertCampaignSubscription,
  cancelSubscription,
  isBuyerSubscribed,
  getSubscribedCampaigns,
  updateCampaingStatus,
  addEvidence,
  updateCampaignInfo,
} from "../queries/Advertisements.js";
import {
  updateNotificationStatus,
  getUsersById,
  getAllMessages,
  getAllChatMessages,
  getSeller,
} from "../queries/Users.js";
import renderEmail from "../utils/emailTamplates/emailTemplate.js";
import sendEmail from "../utils/sendEmail.js";
import getFormattedDate from "../utils/getFormattedDate.js";
import escapeText from "../utils/escapeText.js";
import { addImagesPath } from "../utils/addImagesPath.js";
import getImageNameFromBase64 from "../utils/getImageNameFromBase64.js";
import { getFinishedContract, getUserPaymentCompleted } from "../queries/Payments.js";
import getImageNameFromLink from "../utils/getImageNameFromLink.js";
import { addImageToReviews } from "../utils/addImageToReviews.js";
import { generateQrCode } from "../utils/generateQrCode.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../utils/logger.js";

dotenv.config();

const getAdvertisement = asyncHandler(async (req, res) => {
  try {
    const result = await getAllAdvertisements();
    if (result.length == 0) {
      res.status(200).json({
        data: [],
      });
    } else {
      let advertisementsWithImages;
      if (result.length > 0) {
        advertisementsWithImages = addImagesPath(result);
      } else {
        advertisementsWithImages = [];
      }

      res.status(200).json({
        data: advertisementsWithImages,
      });
    }
  } catch (error) {
    logger.error(error.message, { endpoint: "getAdvertisement" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const getMyAdvertisement = asyncHandler(async (req, res) => {
  const { id, notificationId } = req.body;
  const token = req.cookies.jwt;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const result = await getAdvertisementByCreator(userId, id);
      const finishedListing = await getFinishedContract(userId);
      if (result.length == 0) {
        res.status(200).json({
          data: [],
        });
      } else {
        // Add base64 image to each advertisement object

        const advertisementsWithImages = addImagesPath(result);
        const finishedListingWithImages = addImagesPath(finishedListing);

        const status = {
          all: 0,
          draft: 0,
          available: 0,
          booked: 0,
          completed: 0,
          pending: 0,
          expired: 0,
        };
        advertisementsWithImages.map((item) => {
          if (item.status == "0") {
            status.draft++;
            status.all++;
          } else if (item.status == "1") {
            status.available++;
            status.all++;
          } else if (item.status == "2") {
            status.booked++;
            status.all++;
          } else if (item.status == "4") {
            status.pending++;
            status.all++;
          } else if (item.status == "5") {
            status.expired++;
            status.all++;
          }
        });

        status.completed = finishedListing.length;
        status.all += finishedListing.length;

        const listings = [
          ...advertisementsWithImages,
          ...finishedListingWithImages,
        ];
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
            data: listings,
            status,
          });
        }
      }
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "getMyAdvertisement",
      });
      res.status(500).json({
        error: "Something went wrong",
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
          images.push({ data_url: `${process.env.SERVER_IP}/images/${image}` });
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
    logger.error(error.message, { endpoint: "getSharedListing" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});
const getSellerListings = asyncHandler(async (req, res) => {
  const { id, companyId } = req.body;
  try {
    let sellerInfo = {};
    let image = "";

    if (companyId) {
      const company = await getCompaniesById(companyId);
      sellerInfo = company[0];
    } else {
      const sellers = await getUsersById(id);
      sellerInfo = sellers[0];
    }

    if (sellerInfo.profile_image) {
      image = `${process.env.SERVER_IP}/images/${sellerInfo.profile_image}`;
      sellerInfo = { ...sellerInfo, image: image };
    } else if (sellerInfo.company_logo) {
      image = `${process.env.SERVER_IP}/images/${sellerInfo.company_logo}`;
      sellerInfo = { ...sellerInfo, company_logo: image };
    }

    const result = await getAdvertisementByCreator(id, null, companyId);

    if (result.length == 0) {
      res.status(404).json({
        error: "Advertisement does not exists",
      });
    } else {
      // Add base64 image to each advertisement object

      const advertisementsWithImages = result.map((advertisement) => {
        const images = [];

        const imageArray = advertisement.image.split(";");
        imageArray.map((image) => {
          images.push({ data_url: `${process.env.SERVER_IP}/images/${image}` });
        });

        return {
          ...advertisement,
          image: images,
          shared_image: imageArray[0],
        };
      });
      res.status(200).json({
        listings: advertisementsWithImages,
        profile_info: sellerInfo,
      });
    }
  } catch (error) {
    logger.error(error.message, { endpoint: "getSellerListings" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const getMyBookings = asyncHandler(async (req, res) => {
  const { advertisementId, notificationId } = req.body;
  const token = req.cookies.jwt;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      let result = "";
      let finishedListing = [];
      let pendingBoking = [];
      let subscribedCampaigns = [];
      if (advertisementId) {
        result = await getAdvertisementById(advertisementId);
      } else {
        result = await getAdvertisementAndBuyers(userId);
        subscribedCampaigns = await getSubscribedCampaigns(userId);
        finishedListing = await getFinishedContract(null, userId);
        pendingBoking = await getPendingBookings(userId);
      }
      if (
        result.length == 0 &&
        finishedListing.length == 0 &&
        pendingBoking.length == 0 &&
        subscribedCampaigns.length == 0
      ) {
        res.status(200).json({
          data: [],
        });
      } else {
        const advertisementsWithImages = addImagesPath(result);
        const finishedListingWithImages = addImagesPath(finishedListing);
        const pendingBokingWithImages = addImagesPath(pendingBoking);
        const subscribedCampaignsWithImages =
        addImagesPath(subscribedCampaigns);
        const status = {
          all:
            result.length +
            finishedListing.length +
            pendingBoking.length +
            subscribedCampaigns.length,
          booked: result.length + subscribedCampaigns.length,
          completed: finishedListing.length,
          pending: pendingBoking.length,
        };

        if (notificationId != undefined) {
          updateNotificationStatus(notificationId);
          res.status(200).json({
            data: advertisementsWithImages,
          });
        }
        const bookings = [
          ...advertisementsWithImages,
          ...finishedListingWithImages,
          ...pendingBokingWithImages,
          ...subscribedCampaignsWithImages,
        ];

        res.status(200).json({
          data: bookings,
          status: status,
        });
      }
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "getMyBookings",
      });
      res.status(500).json({
        error: "Something went wrong",
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const getPendingListings = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;

  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const result = await getPendingBookings(userId);

      if (result.length == 0) {
        res.status(200).json({
          data: [],
        });
      } else {
        const advertisementsWithImages = addImagesPath(result);

        res.status(200).json({
          data: advertisementsWithImages,
        });
      }
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "getPendingListings",
      });
      res.status(500).json({
        error: "Something went wrong",
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const createAdvertisement = asyncHandler(async (req, res) => {
  const data = req.body;
  const token = req.cookies.jwt;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const email = decoded.email;

    const createdAt = new Date();
    const formattedCreatedAt = getFormattedDate(createdAt);

    let availableDateFormatted = "";
    if (data.first_available_date) {
      let availableDate = new Date(data.first_available_date);
      availableDateFormatted = getFormattedDate(availableDate);
    }

    let dateFormatted = "";
    if (data.date) {
      let dateFrom = new Date(data.date.from);
      const dateFromFormatted = getFormattedDate(dateFrom);

      let dateTo = new Date(data.date.from);
      if (data.date.to) {
        dateTo = new Date(data.date.to);
      }
      const dateToFormatted = getFormattedDate(dateTo);
      dateFormatted = {
        from: dateFromFormatted,
        to: dateToFormatted,
      };
    }

    let parsedValue = 0;
    if (typeof data.price == "string") {
      parsedValue = parseFloat(data.price.replace(/,/g, ""));
    } else {
      parsedValue = data.price;
    }

    let images = "";
    let imagesGroup = "";
    const result = await getCompanyQuery(data.company_id);
    const user = await getUsersById(userId);
    const userImages = user[0].image_gallery;

    async function processImages() {
      const promises = data.images.map(async (image, index) => {
        if (image.file) {
          return await getImageNameFromBase64(image.data_url, index);
        } else {
          const imageArray = userImages.split(";");
          const foundImage = imageArray.find((galleryImage) => {
            const imagePath = `${process.env.SERVER_IP}/images/${galleryImage}`;
            return image.data_url === imagePath;
          });
          return foundImage ? foundImage : null;
        }
      });

      const results = await Promise.all(promises);
      results.forEach((result) => {
        if (result) {
          images += result + ";";
          imagesGroup += result + ";";
        }
      });
    }

    await processImages();

    images = images.slice(0, -1);
    imagesGroup = imagesGroup.slice(0, -1);
    let userImagesArray = [];
    if (userImages) {
      userImagesArray = userImages.split(";");
    }

    let newgalleryImages = imagesGroup
      .split(";")
      .filter((image) => !userImagesArray.includes(image));
    if (newgalleryImages.length > 0) {
      newgalleryImages = newgalleryImages.join(";");
      addGalleryImages("", userId, userImages, newgalleryImages);

      if (data.company_id) {
        const id = data.company_id;
        addGalleryImages(
          id,
          userId,
          result[0].company_gallery,
          newgalleryImages
        );
      }
    }

    const product = await stripe.products.create({
      name: data.title,
    });

    const price = await stripe.prices.create({
      unit_amount: parseInt(data.price) * 100,
      currency: "usd",
      recurring: {
        interval: "month",
        interval_count: 1,
      },
      product: product.id,
    });

    const results = await getUsersById(userId);
    const userType = results[0].user_type;

    const seller = await getSeller(userId, data.company_id);
    let isAccepted = false;
    if (seller.length > 0) {
      isAccepted = seller[0].isAccepted == "1";
    }

    const userDraft = await getDraftByUserId(userId);
    let newAdvertisement = null;
    let advertisementId = null;
    if (userDraft.length > 0) {
      newAdvertisement = await DraftToAdvertisement(
        userDraft[0].id,
        data,
        userId,
        parsedValue,
        images,
        formattedCreatedAt,
        product,
        price,
        userType,
        dateFormatted,
        availableDateFormatted
      );
      advertisementId = userDraft[0].id;
    } else {
      newAdvertisement = await insertAdvertisement(
        data,
        userId,
        parsedValue,
        images,
        formattedCreatedAt,
        product,
        price,
        userType,
        dateFormatted,
        availableDateFormatted
      );
      advertisementId = newAdvertisement.insertId;
    }

    await generateQrCode(advertisementId);

    const imageName = images.split(";");
    const emailData = {
      title: "ADEX Listing",
      subTitle: "Listing  created",
      message: "Your listing has been successfully created!",
      icon: "listing-created",
      advertisement: {
        title: data.title,
        address: data.address,
        description: data.description,
        image: imageName[0],
        price: parsedValue,
      },
    };
    const emailContent = renderEmail(emailData);
    sendEmail(email, "Listing Created", emailContent, advertisementId);
    //  fs.unlink(`./images/email/qr_code_images/listing_qrcode${advertisementId}.png`, (err) => {
    //   if (err) throw err;
    // });
    data.discounts.map((item) => {
      const createdAt = new Date();
      const formattedCreatedAt = getFormattedDate(createdAt);

      insertDiscounts(advertisementId, item, formattedCreatedAt);
    });
    res.status(200).json({
      message: "data saved successfully.",
    });
  } catch (error) {
    logger.error(error.message, {
      userId: userId,
      endpoint: "createAdvertisement",
    });
    res.status(500).json({
      error: error.message,
    });
  }
});

const updateAdvertisement = asyncHandler(async (req, res) => {
  const {
    id,
    title,
    description,
    price,
    category_id,
    images,
    address,
    latitude,
    longitude,
    ad_duration_type,
    sub_asset_type,
    per_unit_price,
    company_id,
    date,
    first_available_date,
    instructions,
    discounts,
    status,
    digital_duration,
    digital_price_type,
  } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const updatedAt = new Date();
    const formattedUpdatedAt = getFormattedDate(updatedAt);

    let updateImages = "";

    async function processEditImages() {
      const promises = images.map(async (image, index) => {
        if (
          image.data_url.startsWith("http://") ||
          image.data_url.startsWith("https://")
        ) {
          return await getImageNameFromLink(image.data_url);
        } else if (image.data_url.startsWith("data:image/")) {
          return await getImageNameFromBase64(image.data_url, index);
        }
      });

      const results = await Promise.all(promises);
      results.forEach((result) => {
        if (result) {
          updateImages += result + ";";
        }
      });
    }

    await processEditImages();
    updateImages = updateImages.slice(0, -1);

    let availableDateFormatted = "";
    if (first_available_date) {
      let availableDate = new Date(first_available_date);
      availableDateFormatted = getFormattedDate(availableDate);
    }

    let dateFormatted = "";
    if (date?.from) {
      let dateFrom = new Date(date.from);
      const dateFromFormatted = getFormattedDate(dateFrom);

      let dateTo = new Date(date.from);
      if (date.to) {
        dateTo = new Date(date.to);
      }
      const dateToFormatted = getFormattedDate(dateTo);
      dateFormatted = {
        from: dateFromFormatted,
        to: dateToFormatted,
      };
    }

    if (ad_duration_type == 1) {
      availableDateFormatted = "";
    } else {
      dateFormatted = "";
    }

    let durationType = ad_duration_type ? ad_duration_type : 0;

    let reactivate = false;
    if (status == 5) {
      const currentDate = new Date();
      const startDate = new Date(date.from);
      if (startDate > currentDate) {
        reactivate = true;
      }
    }

    const result = await getAdvertisementById(id);
    const currentPrice = result[0].price;
    const currentTitle = result[0].title;
    const stripeProductId = result[0].stripe_product_id;
    let stripePriceId = result[0].stripe_price;

    if (currentPrice != parseInt(price)) {
      //create a new stripe price for that product
      const newPrice = await stripe.prices.create({
        unit_amount: parseInt(price) * 100,
        currency: "usd",
        recurring: {
          interval: "month",
          interval_count: 1,
        },
        product: stripeProductId,
      });
      if (newPrice.id) {
        stripePriceId = newPrice.id;

        const updatedProduct = await stripe.products.update(stripeProductId, {
          default_price: stripePriceId,
        });
      }
    }

    if (currentTitle != title) {
      const updatedProduct = await stripe.products.update(stripeProductId, {
        name: title,
      });
    }
    const query = `
      UPDATE advertisement SET
        title = ${escapeText(title)},
        description = ${escapeText(description)},
        start_date = ${dateFormatted ? `'${dateFormatted.from}'` : null}, 
        end_date = ${dateFormatted ? `'${dateFormatted.to}'` : null}, 
        first_available_date = ${
          availableDateFormatted ? `'${availableDateFormatted}'` : null
        }, 
        price = ${price},
        stripe_price = '${stripePriceId}',
        image = '${updateImages}',
        address = ${escapeText(address)},
        latitude = '${latitude}',
        longitude = '${longitude}',
        ad_duration_type = '${durationType}',
        updated_at = '${formattedUpdatedAt}',
        instructions = ${escapeText(instructions)},
        sub_asset_type = '${sub_asset_type}',
        company_id = '${company_id}',
        per_unit_price = '${per_unit_price}',
        digital_price_type  = ${
          digital_price_type ? `${digital_price_type}` : null
        }, 
        category_id = '${category_id}'
        ${reactivate ? ",status= 1" : ""}
      WHERE id = ${id}
    `;
    updateAdvertismentById(query);

    const allDiscounts = await getDiscountsByAd(id);
    discounts.map((item) => {
      const createdAt = new Date();
      const formattedCreatedAt = getFormattedDate(createdAt);
      if (allDiscounts.length > 0) {
        const ids = allDiscounts.map((discount) => discount.id);
        const existDiscount = ids.includes(item.id);
        if (!existDiscount) {
          insertDiscounts(id, item, formattedCreatedAt);
        }
      } else {
        insertDiscounts(id, item, formattedCreatedAt);
      }
    });

    const user = await getUsersById(userId);
    const email = user[0].email;
    const imageName = updateImages.split(";");
    const emailData = {
      title: "ADEX Listing",
      subTitle: "Listing  Updated",
      message: "Your listing has been successfully updated!",
      icon: "listing-created",
      advertisement: {
        title: title,
        address: address,
        description: description,
        image: imageName[0],
        price: price,
      },
    };
    const emailContent = renderEmail(emailData);
    sendEmail(email, "Listing Updated", emailContent);

    res.status(200).json({ message: "Advertisement updated successfully." });
  } catch (error) {
    logger.error(error.message, {
      userId: userId,
      endpoint: "updateAdvertisement",
    });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const GetAdvertisementDetails = asyncHandler(async (req, res) => {
  const { id, notificationId } = req.body;

  try {
    const result = await getAdvertisementById(id);
    const sellerId = result[0].created_by;
    const seller = await getUsersById(sellerId);
    let image = "";
    if (seller[0].profile_image) {
      image = `${process.env.SERVER_IP}/images/${seller[0].profile_image}`;
    }

    const advertisementsWithImages = addImagesPath(result);

    if (notificationId) {
      updateNotificationStatus(notificationId);
      res.status(200).json({
        data: {
          ...advertisementsWithImages[0],
          seller_image: image,
          seller_name: seller[0].name,
          seller_rating: seller[0].rating,
        },
      });
    } else {
      res.status(200).json({
        data: {
          ...advertisementsWithImages[0],
          seller_image: image,
          seller_name: seller[0].name,
          seller_rating: seller[0].rating,
        },
      });
    }
  } catch (error) {
    logger.error(error.message, { endpoint: "GetAdvertisementDetails" });
    res.status(500).json({
      error: "Something went wrong",
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
      logger.error(error.message, { endpoint: "getMessages" });
      res.status(500).json({
        error: "Something went wrong",
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      // const messagesQuery = `SELECT * FROM messages`;
      const messages = await getAllChatMessages(userId);

      const results = await updateNotificationStatus("", key);

      const notifications = results.affectedRows;
      const messagesWithImage = messages.map((advertisement) => {
        const images = [];
        let profileImage = "";
        if (advertisement.profile_image) {
          profileImage = `${process.env.SERVER_IP}/images/${advertisement.profile_image}`;
        }
        const imageArray = advertisement.image.split(";");
        imageArray.map((image) => {
          images.push({ data_url: `${process.env.SERVER_IP}/images/${image}` });
        });
        return {
          ...advertisement,
          image: images,
          profile_image: profileImage,
        };
      });
      res.status(200).json({
        messages: messagesWithImage,
        notifications: notifications,
      });
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "getChatInfo" });
      res.status(500).json({
        error: "Something went wrong",
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

  try {
    const result = await getDiscountsByAd(id);
    res.status(200).json(result);
  } catch (error) {
    logger.error(error.message, { endpoint: "getDiscounts" });

    res.status(500).json({
      error: "Something went wrong",
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
    logger.error(error.message, { endpoint: "DeleteAdvertisment" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const deleteDiscount = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    deleteDiscountById(id);
    res.status(200).json({
      message: "discount deleted successfully",
    });
  } catch (error) {
    logger.error(error.message, { endpoint: "deleteDiscount" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const createDraft = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    category_id,
    images,
    address,
    latitude,
    longitude,
    ad_duration_type,
    sub_asset_type,
    per_unit_price,
    company_id,
    date,
    first_available_date,
    instructions,
    discounts,
  } = req.body;

  const token = req.cookies.jwt;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const createdAt = new Date();
      const formattedCreatedAt = getFormattedDate(createdAt);

      let draftImages = "";
      let imagesGroup = "";
      const result = await getCompanyQuery(company_id);
      const user = await getUsersById(userId);
      const userImages = user[0].image_gallery;

      images.map((image, index) => {
        //images from user device
        if (image.file) {
          let imageName = Date.now() + index + ".png";
          let path = "./images/" + imageName;
          let imgdata = image.data_url;
          draftImages += imageName + ";";
          imagesGroup += imageName + ";";

          // to convert base64 format into random filename
          let base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");

          fs.writeFileSync(path, base64Data, { encoding: "base64" });
          //images from gallery
        } else {
          const imageArray = userImages.split(";");
          imageArray.map((galleryImage) => {
            if (galleryImage) {
              const imagePath = `${process.env.SERVER_IP}/images/${galleryImage}`;
              if (image.data_url == imagePath) {
                draftImages += galleryImage + ";";
              }
            }
          });
        }
      });
      draftImages = draftImages.slice(0, -1);
      imagesGroup = imagesGroup.slice(0, -1);
      addGalleryImages("", userId, userImages, imagesGroup);

      if (company_id) {
        const id = company_id;
        addGalleryImages(id, userId, result[0].company_gallery, imagesGroup);
      }

      let availableDateFormatted = "";
      if (first_available_date) {
        let availableDate = new Date(first_available_date);
        availableDateFormatted = getFormattedDate(availableDate);
      }

      let dateFormatted = "";
      if (date) {
        let dateFrom = new Date(date.from);
        const dateFromFormatted = getFormattedDate(dateFrom);
        let dateTo = new Date(date.to);
        const dateToFormatted = getFormattedDate(dateTo);
        dateFormatted = {
          from: dateFromFormatted,
          to: dateToFormatted,
        };
      }

      const userDrafts = await getDraftByUserId(userId);
      let advertisementId = "";
      if (userDrafts.length > 0) {
        advertisementId = userDrafts[0].id;
        const newDraft = await updateDraft(
          userDrafts[0].id,
          title,
          description,
          price,
          category_id,
          draftImages,
          address,
          latitude,
          longitude,
          ad_duration_type,
          sub_asset_type,
          per_unit_price,
          dateFormatted,
          availableDateFormatted,
          instructions,
          company_id,
          formattedCreatedAt
        );
      } else {
        const newDraft = await insertDraft(
          title,
          description,
          price,
          category_id,
          draftImages,
          address,
          latitude,
          longitude,
          ad_duration_type,
          sub_asset_type,
          per_unit_price,
          dateFormatted,
          availableDateFormatted,
          instructions,
          company_id,
          userId,
          formattedCreatedAt
        );
        advertisementId = newDraft.insertId;
      }

      const allDiscounts = await getDiscountsByAd(advertisementId);
      discounts.map((item) => {
        const createdAt = new Date();
        const formattedCreatedAt = getFormattedDate(createdAt);
        if (allDiscounts.length > 0) {
          const ids = allDiscounts.map((discount) => discount.id);
          const existDiscount = ids.includes(item.id);
          if (!existDiscount) {
            insertDiscounts(advertisementId, item, formattedCreatedAt);
          }
        } else {
          insertDiscounts(advertisementId, item, formattedCreatedAt);
        }
      });

      res.status(200).json({ messages: "Draft created successfully" });
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "createDraft" });
      res.status(500).json({
        error: "Something went wrong",
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const getDraft = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const result = await getDraftByUserId(id ? id : userId);
      if (result.length == 0) {
        res.status(200).json({
          data: "",
        });
      } else {
        const sub_category = result[0].category_id ? result[0].category_id : "";
        let category = 0;
        if (sub_category) {
          const categories = await getParentCategoryId(sub_category);
          if (categories.length > 0) {
            category = categories[0].parent_id;
          }
        }

        //const building_asset = result[0].category_id ? result[0].category_id : ""
        const building_asset = result[0].sub_asset_type;
        const title = result[0].title ? result[0].title : "";
        const location = result[0].address ? result[0].address : "";
        const latitude = result[0].latitude ? result[0].latitude : 0;
        const longitude = result[0].longitude ? result[0].longitude : 0;
        const description = result[0].description ? result[0].description : "";
        const price = result[0].price ? result[0].price : "";
        const select_business = result[0].company_id
          ? result[0].company_id
          : "";
        let date = "";
        if (result[0].start_date) {
          date = {
            from: result[0].start_date,
            to: result[0].end_date,
          };
        }
        const first_available_date = result[0].first_available_date
          ? result[0].first_available_date
          : "";
        let images = result[0].image ? result[0].image : [];

        if (images.length > 0) {
          const imageArray = images.split(";");
          images = [];
          imageArray.map((image) => {
            images.push({
              data_url: `${process.env.SERVER_IP}/images/${image}`,
            });
          });
        }
        const advertisementId = result[0].id;
        const instructions = result[0].instructions;
        const discounts = await getDiscountsByAd(advertisementId);

        res.status(200).json({
          data: {
            currentStep: 0,
            category,
            sub_category,
            building_asset,
            title,
            location,
            latitude,
            longitude,
            description,
            price,
            discounts,
            date,
            images,
            isDraft: true,
            select_business,
            discounts,
            first_available_date,
            instructions,
          },
        });
      }
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "getDraft" });
      res.status(500).json({
        error: "Something went wrong",
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const getListingReviews = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    const result = await getReviewsByListingId(id);
    const reviewsWithImages = addImageToReviews(result);
    res.status(200).json(reviewsWithImages);
  } catch (error) {
    logger.error(error.message, { endpoint: "getListingReviews" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const getSellerReviews = asyncHandler(async (req, res) => {
  const { id, companyId } = req.body;

  try {
    const result = await getReviewsBySellerId(id, companyId);
    const reviewsWithImages = addImageToReviews(result);
    res.status(200).json(reviewsWithImages);
  } catch (error) {
    logger.error(error.message, { endpoint: "getSellerReviews" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const getBuyerReviews = asyncHandler(async (req, res) => {
  const { id, companyId } = req.body;

  try {
    const result = await getReviewsByBuyerId(id, companyId);
    const reviewsWithImages = addImageToReviews(result);
    res.status(200).json(reviewsWithImages);
  } catch (error) {
    logger.error(error.message, { endpoint: "getBuyerReviews" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const receiveFiles = asyncHandler(async (req, res) => {
  try {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, "images/files");
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      },
    });

    const upload = multer({ storage }).array("files", 1000);

    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(500).json({ error: "Processing file error" });
      }
      res.status(200).json({ message: "File sucessfully saved." });
    });
  } catch (error) {
    logger.error(error.message, { endpoint: "receiveFiles" });

    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const removeFiles = asyncHandler(async (req, res) => {
  const { files } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  try {
    const storageFiles = await fs.promises.readdir("images/files");

    for (const fileName of files) {
      const fullFileName = fileName;

      if (storageFiles.includes(fullFileName)) {
        const filePath = `./images/files/${fullFileName}`;
        await fs.promises.unlink(filePath);
        res.status(200).json({
          success: "Files remove!",
        });
      } else {
        res.status(201).json({
          success: "Could not find the file",
        });
      }
    }
  } catch (error) {
    logger.error(error.message, { endpoint: "removeFiles" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});
const downloadFiles = asyncHandler(async (req, res) => {
  const { file } = req.body;

  try {
    if (!file) {
      return res.status(400).json({ error: "No file name provided" });
    }

    const imagePath = new URL(`../images/files/${file}`, import.meta.url);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "File does not exist" });
    }

    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error(error.message, { endpoint: "downloadFiles" });

    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const createCampaign = asyncHandler(async (req, res) => {
  const data = req.body;
  const token = req.cookies.jwt;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    const createdAt = new Date();
    const formattedCreatedAt = getFormattedDate(createdAt);

    let images = "";
    let imagesGroup = "";
    const result = await getCompanyQuery(data.company_id);
    const user = await getUsersById(userId);
    const userImages = user[0].image_gallery;

    async function processImages() {
      const promises = data.images.map(async (image, index) => {
        if (image.file) {
          return await getImageNameFromBase64(image.data_url, index);
        } else {
          const imageArray = userImages.split(";");
          const foundImage = imageArray.find((galleryImage) => {
            const imagePath = `${process.env.SERVER_IP}/images/${galleryImage}`;
            return image.data_url === imagePath;
          });
          return foundImage ? foundImage : null;
        }
      });

      const results = await Promise.all(promises);
      results.forEach((result) => {
        if (result) {
          images += result + ";";
          imagesGroup += result + ";";
        }
      });
    }

    await processImages();

    images = images.slice(0, -1);
    imagesGroup = imagesGroup.slice(0, -1);
    let userImagesArray = [];
    if (userImages) {
      userImagesArray = userImages.split(";");
    }

    let newgalleryImages = imagesGroup
      .split(";")
      .filter((image) => !userImagesArray.includes(image));
    if (newgalleryImages.length > 0) {
      newgalleryImages = newgalleryImages.join(";");
      addGalleryImages("", userId, userImages, newgalleryImages);

      if (data.company_id) {
        const id = data.company_id;
        addGalleryImages(
          id,
          userId,
          result[0].company_gallery,
          newgalleryImages
        );
      }
    }
    const response = await insertCampaign(
      data,
      userId,
      formattedCreatedAt,
      images
    );
    console.log(response);
    res.status(200).json(response);
  } catch (error) {
    logger.error(error.message, { endpoint: "createCampaign" });

    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const getCampaignSubscribers = asyncHandler(async (req, res) => {
  const { campaignId } = req.params; 
  const token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      const response = await getCampaignSubscribersList(campaignId);
      for (const subscriber of response) {
        const [userPaymentStatus] = await getUserPaymentCompleted(subscriber.campaign_id, userId, subscriber.subscriber_id);
        if (userPaymentStatus) {
          subscriber.payment_status = 'PAID';
        } else {
          subscriber.payment_status = 'UNPAID';
        } 
      }
      res.status(200).json(response);
    } catch (error) {
      logger.error(error.message, { endpoint: "createCampaign" });

      res.status(500).json({
        error: "Something went wrong",
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const createCampaignSubscription = asyncHandler(async (req, res) => {
  const data = req.body;
  const token = req.cookies.jwt;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    const createdAt = new Date();
    const formattedCreatedAt = getFormattedDate(createdAt);
    const campaignId = data.campaign_id;
    const companyId = data.company_id;
    const response = await insertCampaignSubscription(
      campaignId,
      userId,
      formattedCreatedAt,
      companyId
    );
    const subscriptionId = response.insertId;
    if (subscriptionId) {
      await updateCampaingStatus(campaignId);

      const buyerInfo = await getUsersById(userId);
      const buyerEmail = buyerInfo[0].email;
      //send email to the seller
      const advertisement = await getAdvertisementById(data.campaign_id);
      const imageName = advertisement[0].image.split(";");
      const title = advertisement[0].title;
      const emailData = {
        title: "ADEX Campaign",
        subTitle: "Campaign Subscription",
        message: `Your are successfully subscribed in this campaign!`,
        icon: "listing-created",
        advertisement: {
          title: title,
          address: '',
          price: 0,
          image: imageName[0],
        },
      };
      const emailContent = renderEmail(emailData);
      sendEmail(buyerEmail, "Campaign Subscription", emailContent);
    }
    res.status(200).json({ subscriptionId: subscriptionId });
  } catch (error) {
    logger.error(error.message, { endpoint: "createCampaign" });

    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const cancelCampaignSubscription = asyncHandler(async (req, res) => {
  const data = req.body;
  try {
    const subscriptionId = data.subscription_id;
    const response = await cancelSubscription(subscriptionId);
    res.status(200).json(response);
  } catch (error) {
    logger.error(error.message, { endpoint: "createCampaign" });

    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const checkBuyerSubscription = asyncHandler(async (req, res) => {
  const { campaignId } = req.params; 
  const token = req.cookies.jwt;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const response = await isBuyerSubscribed(campaignId, userId);
      res.status(200).json(response);
    } catch (error) {
      logger.error(error.message, { endpoint: "createCampaign" });
      res.status(500).json({
        error: "Something went wrong",
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const addEvidenceToCampaign = asyncHandler(async (req, res) => {
  const data = req.body;
  const token = req.cookies.jwt;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    const response = await addEvidence(data.campaign_id, data.evidence, userId);
    console.log(response);
    res.status(200).json(response);
  } catch (error) {
    logger.error(error.message, { endpoint: "createCampaign" });

    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const updateCampaign = asyncHandler(async (req, res) => {
  const data = req.body;
  const token = req.cookies.jwt;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    let updateImages = "";

    async function processEditImages() {
      const promises = data.images.map(async (image, index) => {
        if (
          image.data_url.startsWith("http://") ||
          image.data_url.startsWith("https://")
        ) {
          return await getImageNameFromLink(image.data_url);
        } else if (image.data_url.startsWith("data:image/")) {
          return await getImageNameFromBase64(image.data_url, index);
        }
      });

      const results = await Promise.all(promises);
      results.forEach((result) => {
        if (result) {
          updateImages += result + ";";
        }
      });
    }

    await processEditImages();
    updateImages = updateImages.slice(0, -1);

    const response = await updateCampaignInfo(data,updateImages);
    console.log(response);
    res.status(200).json(response);
  } catch (error) {
    logger.error(error.message, { endpoint: "createCampaign" });

    res.status(500).json({
      error: "Something went wrong",
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
  getSellerListings,
  createDraft,
  getDraft,
  deleteDiscount,
  getPendingListings,
  getListingReviews,
  getSellerReviews,
  getBuyerReviews,
  receiveFiles,
  removeFiles,
  downloadFiles,
  createCampaign,
  getCampaignSubscribers,
  createCampaignSubscription,
  cancelCampaignSubscription,
  checkBuyerSubscription,
  addEvidenceToCampaign,
  updateCampaign,
};
