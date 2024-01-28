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
} from "../queries/Advertisements.js";
import {
  updateNotificationStatus,
  getUsersById,
  getAllMessages,
  getAllChatMessages,
} from "../queries/Users.js";
import renderEmail from "../utils/emailTamplates/emailTemplate.js";
import sendEmail from "../utils/sendEmail.js";
import getFormattedDate from "../utils/getFormattedDate.js";
import escapeText from "../utils/escapeText.js";
import { addImagesPath } from "../utils/addImagesPath.js";
import getImageNameFromBase64 from "../utils/getImageNameFromBase64.js";
import { getFinishedContract } from "../queries/Payments.js";
import getImageNameFromLink from "../utils/getImageNameFromLink.js";
import { addImageToReviews } from "../utils/addImageToReviews.js";
import { log } from "console";
import getImageBase64 from "../utils/getImageBase64.js";
import { generateQrCode } from "../utils/generateQrCode.js";

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
          finished: 0,
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

        status.finished = finishedListing.length;
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
  console.log("entrou no sharing listing");
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
    console.error(error);
    res.status(401).json({
      error: "Not authorized, token failed",
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
        listings: advertisementsWithImages,
        profile_info: sellerInfo,
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
      let finishedListing = [];
      let pendingBoking = [];
      if (advertisementId) {
        result = await getAdvertisementById(advertisementId);
      } else {
        result = await getAdvertisementAndBuyers(userId);
        finishedListing = await getFinishedContract(null, userId);
        pendingBoking = await getPendingBookings(userId);
      }
      if (
        result.length == 0 &&
        finishedListing.length == 0 &&
        pendingBoking.length == 0
      ) {
        res.status(200).json({
          data: [],
        });
      } else {
        const advertisementsWithImages = addImagesPath(result);
        const finishedListingWithImages = addImagesPath(finishedListing);
        const pendingBokingWithImages = addImagesPath(pendingBoking);

        const status = {
          all: result.length + finishedListing.length + pendingBoking.length,
          booked: result.length,
          finished: finishedListing.length,
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
        ];

        res.status(200).json({
          data: bookings,
          status: status,
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

const getPendingListings = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
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
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const userId = decoded.userId;
  const email = decoded.email;

  const createdAt = new Date();
  const formattedCreatedAt = getFormattedDate(createdAt);

  let availableDateFormatted = "";
  if (data.first_available_date) {
    let availableDate = new Date(data.first_available_date.substring(0, 10));
    availableDateFormatted = getFormattedDate(availableDate);
  }

  let dateFormatted = "";
  if (data.date) {
    let dateFrom = new Date(data.date.from.substring(0, 10));
    const dateFromFormatted = getFormattedDate(dateFrom);

    let dateTo = new Date(data.date.from.substring(0, 10));
    if (data.date.to) {
      dateTo = new Date(data.date.to.substring(0, 10));
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

  data.images.map((image, index) => {
    //images from user device
    if (image.file) {
      const imageName = getImageNameFromBase64(image.data_url);
      images += imageName + ";";
      imagesGroup += imageName + ";";
    } else {
      const imageArray = userImages.split(";");
      imageArray.map((galleryImage) => {
        if (galleryImage) {
          const imagePath = `${process.env.SERVER_IP}/images/${galleryImage}`;
          if (image.data_url == imagePath) {
            images += galleryImage + ";";
          }
        }
      });
    }
  });
  images = images.slice(0, -1);
  imagesGroup = imagesGroup.slice(0, -1);
  addGalleryImages("", userId, userImages, imagesGroup);

  if (data.company_id) {
    const id = data.company_id;
    addGalleryImages(id, userId, result[0].company_gallery, imagesGroup);
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
  
  await generateQrCode(advertisementId)
  
  const imageName = images.split(";");
  const emailData = {
    title: "ADEX Listing",
    subTitle: "Listing  created",
    message: "Your Listing has been successfully created ",
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
   sendEmail(email, "Listing Created", emailContent,advertisementId);
   fs.unlink(`./images/email/qr_code_images/listing_qrcode${advertisementId}-1.png`, (err) => {
    if (err) throw err;
  });
  data.discounts.map((item) => {
    const createdAt = new Date();
    const formattedCreatedAt = getFormattedDate(createdAt);

    insertDiscounts(advertisementId, item, formattedCreatedAt);
  });
  res.status(200).json({
    message: "data saved successfully.",
  });
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
    lat,
    long,
    ad_duration_type,
    sub_asset_type,
    per_unit_price,
    company_id,
    date,
    first_available_date,
    instructions,
    discounts,
    status
  } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const updatedAt = new Date();
  const formattedUpdatedAt = getFormattedDate(updatedAt);

  let updateImages = "";
  images.map((image) => {
    let imageName = "";
    if (
      image.data_url.startsWith("http://") ||
      image.data_url.startsWith("https://")
    ) {
      imageName = getImageNameFromLink(image.data_url);
    } else if (image.data_url.startsWith("data:image/")) {
      imageName = getImageNameFromBase64(image.data_url);
    }
    updateImages += imageName + ";";
  });
  updateImages = updateImages.slice(0, -1);

  let availableDateFormatted = "";
  if (first_available_date) {
    let availableDate = new Date(first_available_date);
    availableDateFormatted = getFormattedDate(availableDate);
  }

  let dateFormatted = "";
  if (date.from) {
    let dateFrom = new Date(date.from.substring(0, 10));
    const dateFromFormatted = getFormattedDate(dateFrom);

    let dateTo = new Date(date.from.substring(0, 10));
    if (date.to) {
      dateTo = new Date(date.to.substring(0, 10));
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

  let reactivate = false
  if(status == 5){
    const currentDate = new Date()
    const startDate = new Date(date.from)
    if(startDate > currentDate){
      reactivate = true
    }
    console.log('date.from',date.from)
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
      image = '${updateImages}',
      address = ${escapeText(address)},
      lat = '${lat}',
      \`long\` = '${long}',
      ad_duration_type = '${ad_duration_type ? ad_duration_type : 0}',
      updated_at = '${formattedUpdatedAt}',
      instructions = ${escapeText(instructions)},
      sub_asset_type = '${sub_asset_type}',
      company_id = '${company_id}',
      per_unit_price = '${per_unit_price}',
      category_id = '${category_id}'
      ${reactivate ? ',status= 1' : ''}
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
    subTitle: "Listing  created",
    message: "Your Listing has been successfully updated ",
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

  try {
    const result = await getDiscountsByAd(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      error: "Not authorized, token failed",
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

const deleteDiscount = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    deleteDiscountById(id);
    res.status(200).json({
      message: "discount deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({
      error: "Not authorized, token failed",
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
    lat,
    long,
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
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

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
        let availableDate = new Date(first_available_date.substring(0, 10));
        availableDateFormatted = getFormattedDate(availableDate);
      }

      let dateFormatted = "";
      if (date) {
        let dateFrom = new Date(date.from.substring(0, 10));
        const dateFromFormatted = getFormattedDate(dateFrom);
        let dateTo = new Date(date.to.substring(0, 10));
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
          lat,
          long,
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
          lat,
          long,
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

const getDraft = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
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

const getListingReviews = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    const result = await getReviewsByListingId(id);
    const reviewsWithImages = addImageToReviews(result);
    res.status(200).json(reviewsWithImages);
  } catch (error) {
    res.status(401).json({
      error: "Not authorized, token failed",
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
    res.status(401).json({
      error: "Not authorized, token failed",
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
  getSellerListings,
  createDraft,
  getDraft,
  deleteDiscount,
  getPendingListings,
  getListingReviews,
  getSellerReviews,
  getBuyerReviews
};
