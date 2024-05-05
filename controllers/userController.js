import asyncHandler from "express-async-handler";
import database from ".././db.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import * as fs from "fs";
import pkg from "ip";
import sendEmail from "../utils/sendEmail.js";
import {
  editCompanyById,
  getCompaniesQuery,
  removeCompanyById,
} from "../queries/Companies.js";
import dotenv from "dotenv";
import {
  getUsersByEmail,
  getSeller,
  getUsersById,
  updateUserAddressInfo,
  insertSeller,
  updateProfileImage,
  updatePublicProfile,
  getUserNotifications,
  resetUserPassword,
  insertUser,
  updateNotificationStatus,
  updateSellerVerificationStatus,
  insertUserNotifications,
  insertMessages,
  updateGalleryImage,
  getUserRating,
  getBuyerRating,
  insertBuyerRating,
  updateCompanyRating,
  updateUserRating,
  getSellersRating,
  insertSellerRating,
  updateListingRate,
  addPlataformsAndFollowers,
  setIsContentCreatorById,
  addPreference,
  removePreference,
  removePlataformAndFollowers,
  insertContactUs,
} from "../queries/Users.js";
import {
  insertCompany,
  getCompaniesById,
  addGalleryImages,
} from "../queries/Companies.js";
import renderEmail from "../utils/emailTamplates/emailTemplate.js";
import { verifyIdentity } from "../utils/VerifyIdentity.js";
import getFormattedDate from "../utils/getFormattedDate.js";
import getImageNameFromLink from "../utils/getImageNameFromLink.js";
import getImageNameFromBase64 from "../utils/getImageNameFromBase64.js";
import {
  getContractById,
  getContractByStripeId,
  updateContractRatingStatus,
} from "../queries/Payments.js";
import logger from "../utils/logger.js";

dotenv.config();

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await getUsersByEmail(email);

  if (result.length == 0) {
    res
      .status(400)
      .json({ message: "This email isn't registered,please Sign up." });
  } else {
    const hashPass = result[0].password;
    const userId = result[0].id;
    const firstName = result[0].first_name;
    const lastName = result[0].last_name;
    const userType = result[0].user_type;

    let image = "";
    if (result[0].profile_image) {
      image = `${process.env.SERVER_IP}/images/${result[0].profile_image}`;
    }
    bcrypt.compare(password, hashPass).then(async function (result) {
      if (result) {
        generateToken(res, userId, firstName + " " + lastName, email);
        const resultSeller = await getSeller(userId);
        if (resultSeller.length == 0) {
          res.status(200).json({
            name: firstName,
            image: image,
            userId: userId,
            user_type: userType,
            userType: userType,
          });
        } else {
          const externalAccount = resultSeller[0].external_account_id;
          if (externalAccount) {
            res.status(201).json({
              name: firstName,
              image: image,
              userId: userId,
              hasPayout: externalAccount,
              userType: userType,
            });
          } else {
            res.status(201).json({
              name: firstName,
              image: image,
              userId: userId,
              userType: userType,
            });
          }
        }
      } else {
        res.status(401).json({ message: "Wrong password" });
      }
    });
  }
});

const autoLogin = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const result = await getUsersById(userId);
      if (result.length == 0) {
        res.status(404).json({
          error: "User does not exists",
        });
      } else {
        const firstName = result[0].first_name;

        let image = "";
        if (result[0].profile_image) {
          image = `${process.env.SERVER_IP}/images/${result[0].profile_image}`;
        }
        res.status(200).json({
          name: firstName,
          image: image,
          userId: result[0].id,
          rating: result[0].rating,
          userType: result[0].user_type,
        });
      }
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "autoLogin" });
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

const registerUser = asyncHandler(async (req, res) => {
  const { name, firstName, lastName, phone, email, accountType, password } =
    req.body;

  const result = await getUsersByEmail(email);
  if (result.length > 0) {
    res
      .status(401)
      .json({ error: "User already exists, please use a different email." });
  } else {
    bcrypt.hash(password, 10).then(async function (hashedPass) {
      // Store hash in your password DB.
      const results = await insertUser(
        name,
        firstName,
        lastName,
        phone,
        email,
        accountType,
        hashedPass
      );
      const userId = results.insertId;
      generateToken(res, userId, firstName + " " + lastName, email);
      // send the email
      const emailData = {
        title: "Welcome to ADEX!",
        subTitle: "",
        message:
          "Welcome to ADEX, the place where you are the Asset! Browse or create listings to get started today. We hope you have a wonderful experience on our platform.",
        icon: "user-registered",
      };
      const emailContent = renderEmail(emailData);
      sendEmail(email, "User registered", emailContent);

      res.status(200).json({
        name: firstName,
        userId: userId,
      });
    });
  }
});

const logoutUser = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

const getSellerProfile = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { companyId } = req.body;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const result = await getSeller(userId, companyId);
      const user = await getUsersById(userId);
      const userType = user[0].user_type;
      let seller = {};
      if (result.length == 0) {
        seller = { user_type: userType };
        res.status(200).json({
          data: seller,
        });
      } else {
        seller = { ...result[0], user_type: userType };
        res.status(200).json({
          data: seller,
        });
      }
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "getSellerProfile",
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

const createUserConnectAccount = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { address } = pkg;
  const { idNumber, dob, street, city, state, zip, verificationImage } =
    req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const currentDate = new Date();
  const formattedCreatedAt = getFormattedDate(currentDate);

  const result = await getUsersById(userId);

  if (result.length > 0) {
    try {
      const user = result[0];
      const imageName = userId + "_verification.png";
      const path = "./images/verification/" + imageName;
      const imgdata = verificationImage;
      // to convert base64 format into random filename
      const base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(path, base64Data, { encoding: "base64" });

      const fp = fs.readFileSync(path);

      fs.unlink(path, (err) => {
        if (err) throw err;
      });

      const file = await stripe.files.create({
        purpose: "identity_document",
        file: {
          data: fp,
          name: imageName,
          type: "application/octet-stream",
        },
      });

      const seller = await getSeller(userId);

      if (seller.length > 0) {
        const sellerStripeAccount = seller[0].stripe_account;
        //update the connect account
        const account = await stripe.accounts.update(sellerStripeAccount, {
          individual: {
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            id_number: idNumber,
            phone: user.mobile_number,
            address: {
              country: "US",
              city: city, //city,
              line1: street,
              postal_code: zip,
              state: state, //state
            },
            political_exposure: "none",
            dob: {
              day: dob.substring(8, 10),
              month: dob.substring(5, 7),
              year: dob.substring(0, 4),
            },

            verification: {
              document: {
                front: file.id,
                // front: "file_identity_document_success",
              },
            },
          },
        });
        if (account.id) {
          const { status, error } = await verifyIdentity(account.id);

          if (status) {
            updateSellerVerificationStatus(userId);
            res.status(200).json({ account: sellerStripeAccount });
          } else {
            res.status(400).json({
              error: error ? error : "Something went wrong, please try again.",
            });
          }
        }
      } else {
        //create the connect account
        const account = await stripe.accounts.create({
          type: "custom",
          business_type: "individual",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            mcc: 7299,
            product_description: "Custumers will pay monthly or one-time",
          },
          tos_acceptance: {
            date: currentDate,
            ip: address(),
          },
          company: {
            tax_id: idNumber,
            name: user.name,
          },
          settings: {
            payments: {
              statement_descriptor: `${user.first_name} ${user.last_name}`,
            },
          },
          individual: {
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            id_number: idNumber,
            phone: user.mobile_number,
            address: {
              country: "US",
              city: city,
              line1: street,
              postal_code: zip,
              state: state,
            },
            political_exposure: "none",
            dob: {
              day: dob.substring(8, 10),
              month: dob.substring(5, 7),
              year: dob.substring(0, 4),
            },

            verification: {
              document: {
                front: file.id,
              },
            },
          },
        });

        if (account.id) {
          let verifiedAccount = "";
          const { status, error } = await verifyIdentity(account.id);
          if (status) {
            verifiedAccount = "1";
            insertSeller(
              userId,
              account.id,
              formattedCreatedAt,
              verifiedAccount
            );
            res.status(200).json({ account: account.id });
          } else {
            verifiedAccount = "0";
            insertSeller(
              userId,
              account.id,
              formattedCreatedAt,
              verifiedAccount
            );
            res.status(400).json({
              error: error ? error : "Something went wrong, please try again.",
            });
          }
        } else {
          res.status(400).json({ error: account });
        }
      }
    } catch (error) {
      if (error.message.includes("is not a valid phone number")) {
        res.status(400).json({
          error:
            error.message +
            ". Please change your number in your personal information section",
        });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  } else {
    res.status(400).json({ error: "User does't  exists" });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function verifyIdentity(accountId) {
    let accountRetrieved = "";
    let verifiedStatus = "";
    let errorDetails = "";

    while (true) {
      accountRetrieved = await stripe.accounts.retrieve(accountId);

      verifiedStatus = accountRetrieved.individual.verification.status;
      errorDetails = accountRetrieved.individual.verification.document.details;

      if (verifiedStatus !== "pending") {
        return {
          status: verifiedStatus == "verified",
          error: errorDetails ? errorDetails : "",
        };
      }
      await delay(2000);
    }
  }
});

const createCompanyConnectAccount = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { address } = pkg;
  const {
    idNumber,
    mccValue,
    name,
    street,
    city,
    state,
    zip,
    dob,
    jobTitle,
    ownerIdNumber,
    ownerStreet,
    ownerCity,
    ownerState,
    ownerZip,
    verificationImage,
    companyId,
  } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const currentDate = new Date();
  const formattedCreatedAt = getFormattedDate(currentDate);

  const result = await getUsersById(userId);

  if (result.length > 0) {
    try {
      const user = result[0];
      const imageName = userId + "_verification.png";
      const path = "./images/verification/" + imageName;
      const imgdata = verificationImage;
      const base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(path, base64Data, { encoding: "base64" });

      const fp = fs.readFileSync(path);

      fs.unlink(path, (err) => {
        if (err) throw err;
      });

      const file = await stripe.files.create({
        purpose: "identity_document",
        file: {
          data: fp,
          name: imageName,
          type: "application/octet-stream",
        },
      });

      const seller = await getSeller(userId, companyId);

      if (seller.length > 0) {
        const sellerStripeAccount = seller[0].stripe_account;
        //update the connect account
        const account = await stripe.accounts.update(sellerStripeAccount, {
          company: {
            name: name,
            tax_id: idNumber,
            phone: "3055282118",
            address: {
              country: "US",
              city: city, //city,
              line1: street,
              postal_code: zip,
              state: state, //state
            },
            verification: {
              document: {
                front: file.id,
                // front: "file_identity_document_success",
              },
            },
          },
        });
        if (account.id) {
          const { status, error } = await verifyIdentity(account.id, true);

          if (status) {
            updateSellerVerificationStatus(userId);
            res.status(200).json({ account: sellerStripeAccount });
          } else {
            res.status(400).json({
              error: error ? error : "Something went wrong, please try again.",
            });
          }
        }
      } else {
        //create the connect account
        const account = await stripe.accounts.create({
          type: "custom",
          business_type: "company",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            mcc: mccValue,
            // url:
            //   "www." +
            //   user.email.substring(
            //     0,
            //     user.email.indexOf("@") > 16 ? 16 : user.email.indexOf("@")
            //   ),
            product_description: "Custumers will pay monthly or one-time",
          },
          settings: {
            payments: {
              statement_descriptor: `${name}`,
            },
          },
          company: {
            name: name,
            tax_id: idNumber,
            phone: "3055282118",
            address: {
              country: "US",
              city: city, //city,
              line1: street,
              postal_code: zip,
              state: state, //state
            },
          },
        });

        if (account.id) {
          let verifiedAccount = "";
          const person = await stripe.accounts.createPerson(account.id, {
            first_name: user.first_name,
            last_name: user.last_name,
            dob: {
              day: dob.substring(8, 10),
              month: dob.substring(5, 7),
              year: dob.substring(0, 4),
            },
            email: user.email,
            relationship: {
              title: jobTitle,
              owner: true,
              representative: true,
            },
            id_number: ownerIdNumber,
            phone: user.mobile_number,
            address: {
              country: "US",
              city: ownerCity, //city,
              line1: ownerStreet,
              postal_code: ownerZip,
              state: ownerState, //state
            },
            verification: {
              document: {
                front: file.id,
              },
            },
          });

          const { status, error } = await verifyIdentity(
            account.id,
            true,
            person.id
          );
          if (status) {
            const accountUpdate = await stripe.accounts.update(account.id, {
              company: {
                owners_provided: true,
              },
              tos_acceptance: {
                date: currentDate,
                ip: address(),
              },
            });

            verifiedAccount = "1";
            insertSeller(
              userId,
              account.id,
              formattedCreatedAt,
              verifiedAccount,
              companyId
            );
            res.status(200).json({ account: account.id });
          } else {
            verifiedAccount = "0";
            insertSeller(
              userId,
              account.id,
              formattedCreatedAt,
              verifiedAccount,
              companyId
            );
            res.status(400).json({
              error: error ? error : "Something went wrong, please try again.",
            });
          }
        } else {
          res.status(400).json({ error: account });
        }
      }
    } catch (error) {
      if (error.message.includes("is not a valid phone number")) {
        res.status(400).json({
          error:
            error.message +
            ". Please change your number in your personal information section",
        });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  } else {
    res.status(400).json({ error: "User does't  exists" });
  }
});

const testRoute = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { address } = pkg;

  const currentDate = new Date();

  const emailData = {
    title: "Welcome to ADEX!",
    subTitle: "",
    message:
      "Welcome to ADEX, the place where you are the Asset! Browse or create listings to get started today. We hope you have a wonderful experience on our platform.",
    icon: "user-registered",
  };
  const emailContent = renderEmail(emailData);
  sendEmail("eduardosanchezcidron@gmail.com", "User registered", emailContent);

  // const accountUpdate = await stripe.accounts.update('acct_1O0okDPxf7ppCHyx', {
  //   company: {
  //     tax_id:'123456789',
  //   }

  // });

  // const account = await stripe.accounts.create({
  //   type: "custom",
  //   business_type: "company",
  //   capabilities: {
  //     card_payments: { requested: true },
  //     transfers: { requested: true },
  //   },
  //   business_profile: {
  //     mcc: 5971,
  //     url: "www.teste.com" ,
  //   },
  //   tos_acceptance: {
  //     date: currentDate,
  //     ip: address(),
  //   },
  //   company: {
  //     name: 'adex connect',
  //     tax_id: '123456789',
  //     phone: '3055282118',
  //     address: {
  //       country: "US",
  //       city: 'Fresno', //city,
  //       line1: '2027 Edgewood Avenue',
  //       postal_code: '93721',
  //       state: 'CA', //state
  //     },
  //     // verification: {
  //     //   document: {
  //     //     front: file.id,
  //     //     // front: "file_identity_document_success",
  //     //   },
  //     // },
  //   },
  // });

  // const person = await stripe.accounts.createPerson(account.id, {

  //   first_name: "Jane",
  //   last_name: "Diaz",
  //   dob: {
  //     day: '02',
  //     month: '07',
  //     year: '1993',
  //   },
  //   email:'xxxx@gmail.com',
  //   relationship:{
  //     title :'CTO',
  //     owner:true,
  //     representative:true

  //   },
  //   id_number:'123456789',
  //   phone:'3055282118',
  //   address: {
  //     country: "US",
  //     city: 'Fresno', //city,
  //     line1: '2027 Edgewood Avenue',
  //     postal_code: '93721',
  //     state: 'CA', //state
  //   },
  //   verification: {
  //     document: {
  //       front: "file_identity_document_success",
  //     },
  //   }

  // });

  // const person = await stripe.accounts.updatePerson(
  //   'acct_1O0YM0Q0XgtK48Xb',
  //   'person_1O0YMAQ0XgtK48Xb59XZtOxN',
  //   {
  //     email:'xxxx@gmail.com',
  //     relationship:{
  //       title :'CTO',
  //       representative:true
  //     },
  //     id_number:'123456789',
  //     phone:'3055282118',
  //     address: {
  //       country: "US",
  //       city: 'Fresno', //city,
  //       line1: '2027 Edgewood Avenue',
  //       postal_code: '93721',
  //       state: 'CA', //state
  //     },
  //     // verification: {
  //     //   document: {
  //     //     front: "file_identity_document_success",
  //     //   },
  //     // },
  //   }
  // );

  res.status(200).json({ message: accountUpdate });
});

const getExternalAccount = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { companyId } = req.body;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const result = await getSeller(userId, companyId);
      if (result.length == 0) {
        res.status(200).json({
          data: "",
        });
      } else {
        const externalAccount = result[0].external_account_id;
        if (externalAccount) {
          res.status(200).json({
            data: externalAccount,
          });
        } else {
          res.status(200).json({
            data: "",
          });
        }
      }
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "getExternalAccount",
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

const getUserProfile = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;
  let userId = "";
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  }
  try {
    const result = await getUsersById(id ? id : userId);
    if (result.length == 0) {
      res.status(200).json({
        data: "",
      });
    } else {
      const name = result[0].first_name;
      const lastName = result[0].last_name;
      const email = result[0].email;
      const phone = result[0].mobile_number;
      const bio = result[0].bio;
      const sex = result[0].sex;
      const profession = result[0].profession;
      const handle = result[0].handle;
      const handleIsPublic = result[0].handle_is_public;
      const professionIsPublic = result[0].profession_is_public;
      const sexIsPublic = result[0].sex_is_public;
      const bioIsPublic = result[0].bio_is_public;
      const city = result[0].city;
      const cityIsPublic = result[0].city_is_public;
      const userType = result[0].user_type;
      const images = result[0].image_gallery;
      const isContentCreator =
        result[0].is_content_creator == "1" ? true : false;
      const imagesWithPath = [];
      const rating = result[0].rating;
      if (images) {
        const imageArray = images.split(";");
        imageArray.map((image) => {
          if (image) {
            const imagePath = `${process.env.SERVER_IP}/images/${image}`;
            imagesWithPath.push({ data_url: imagePath });
          }
        });
      }
      let image = "";
      if (result[0].profile_image) {
        image = `${process.env.SERVER_IP}/images/${result[0].profile_image}`;
      }
      res.status(200).json({
        name,
        lastName,
        email,
        image,
        phone,
        bio,
        sex,
        profession,
        handle,
        handleIsPublic,
        professionIsPublic,
        sexIsPublic,
        bioIsPublic,
        city,
        cityIsPublic,
        userType,
        images: imagesWithPath,
        rating,
        isContentCreator,
      });
    }
  } catch (error) {
    logger.error(error.message, { userId: userId, endpoint: "getUserProfile" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const updateUserProfileImage = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { image } = req.body;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      let imageName = "";
      if (image) {
        imageName = Date.now() + ".png";
        const path = "./images/" + imageName;
        const imgdata = image;
        const base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(path, base64Data, { encoding: "base64" });
      }
      updateProfileImage(imageName, userId);
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "updateUserProfileImage",
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

const updateUserProfile = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const {
    name,
    lastName,
    email,
    phone,
    bio,
    sex,
    profession,
    handle,
    handleIsPublic,
    professionIsPublic,
    sexIsPublic,
    bioIsPublic,
    city,
    cityIsPublic,
  } = req.body;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      updatePublicProfile(
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
        userId
      );
      res.status(200).json({
        message: "Profile updated!",
      });
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "updateUserProfile",
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

const getMyNotifications = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const result = await getUserNotifications(userId);
      res.status(200).json({
        notifications: result,
      });
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "getMyNotifications",
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

const resetPassword = asyncHandler(async (req, res) => {
  const { password, email } = req.body;
  const result = await getUsersByEmail(email);
  if (result.length == 0) {
    res.status(401).json({ error: "User do not exist, please sign up" });
  } else {
    bcrypt.hash(password, 10).then(function (hashedPass) {
      // Store hash in your password DB.
      resetUserPassword(hashedPass, email);
      res.status(200).json({ message: "Password changed successfuly" });
    });
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { newPassword, current } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  const result = await getUsersById(userId);
  if (result.length == 0) {
    res.status(401).json({ error: "User do not exist, please sign up" });
  } else {
    const email = result[0].email;
    bcrypt.compare(current, result[0].password).then(function (result) {
      if (result) {
        bcrypt.hash(newPassword, 10).then(function (hashedPass) {
          // Store hash in your password DB.
          resetUserPassword(hashedPass, email);

          const emailData = {
            title: "ADEX Password Changed!",
            subTitle: "Your password has been changed.",
            message:
              "If you did not initiate a change to your user profile, please contact us immediately at security@adexemailcontact.com.",
            icon: "password-changed",
          };
          const emailContent = renderEmail(emailData);
          sendEmail(email, "Password Changed", emailContent);
          res.status(200).json({ message: "Password changed successfuly" });
        });
      } else {
        res.status(401).json({ error: "The current password does not match" });
      }
    });
  }
});

const sendResetPasswordEmail = asyncHandler(async (req, res) => {
  const { email, codeOTP } = req.body;

  const emailData = {
    title: "ADEX Password Reset Requested!",
    subTitle: "",
    message: `Your security code for reset your password is ${codeOTP}`,
    icon: "password-changed",
  };
  const emailContent = renderEmail(emailData);
  sendEmail(email, "Reset Password", emailContent);

  res.status(200).json({ message: "Email Notification Sent" });
});

const contactUs = asyncHandler(async (req, res) => {
  const { name, email, number, message } = req.body;
  const createdAt = new Date();
  const formattedCreatedAt = getFormattedDate(createdAt);

  insertContactUs(name, email, number, message, formattedCreatedAt);

  //put the adex email account
  sendEmail(
    process.env.EMAIL_SUPPORT,
    "Customer Support",
    `${name} has sended the following message :
    ${message}
    `
  );
  res.status(200).json({ message: "Message sended successfuly" });
});

const addCompany = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { name, image, address, hasPhysicalSpace, industry } = req.body;

  const createdAt = new Date();
  const formattedCreatedAt = getFormattedDate(createdAt);

  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      let imageName = "";

      if (image.startsWith("http://") || image.startsWith("https://")) {
        imageName = getImageNameFromLink(image);
      } else if (image.startsWith("data:image/")) {
        imageName = await getImageNameFromBase64(image, 1);
      }

      insertCompany(
        userId,
        name,
        imageName,
        address,
        industry,
        hasPhysicalSpace,
        formattedCreatedAt
      );
      res.status(200).json({ message: "Company registered succesfully" });
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "addCompany" });
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

const editCompany = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id, name, image, address, hasPhysicalSpace, industry } = req.body;

  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      let imageName = "";

      if (image.startsWith("http://") || image.startsWith("https://")) {
        imageName = getImageNameFromLink(image);
      } else if (image.startsWith("data:image/")) {
        imageName = await getImageNameFromBase64(image, 1);
      }

      editCompanyById(
        id,
        userId,
        name,
        imageName,
        address,
        industry,
        hasPhysicalSpace
      );
      res.status(200).json({ message: "Company edited succesfully" });
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "editCompany" });
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

const getCompanies = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const result = await getCompaniesQuery(userId);

      if (result.length > 0) {
        result.map((item, index) => {
          let image = "";
          if (item.company_logo) {
            image = `${process.env.SERVER_IP}/images/${item.company_logo}`;
            result[index].company_logo = image;
          }
        });
      }
      res.status(200).json(result);
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "getCompanies" });
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

const removeCompany = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    removeCompanyById(id);
    res.status(200).json({
      message: "company removed successfully",
    });
  } catch (error) {
    logger.error(error.message, { endpoint: "removeCompany" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const getCompany = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;

  try {
    const result = await getCompaniesById(id);

    if (result.length > 0) {
      result.map((item, index) => {
        let image = "";
        if (item.company_logo) {
          image = `${process.env.SERVER_IP}/images/${item.company_logo}`;
          result[index].company_logo = image;
        }
      });
    }
    res.status(200).json(result);
  } catch (error) {
    logger.error(error.message, { endpoint: "getCompany" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const imageGallery = asyncHandler(async (req, res) => {
  const { id, images } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const user = await getUsersById(userId);
  const userImages = user[0].image_gallery;
  let finalImages = [];
  if (userImages) {
    let oldImages = [];
    const imageArray = userImages.split(";");
    imageArray.map((image) => {
      if (image) {
        const imagePath = `${process.env.SERVER_IP}/images/${image}`;
        oldImages.push(imagePath);
      }
    });

    images.map((newImage) => {
      if (!oldImages.includes(newImage.data_url)) {
        finalImages.push(newImage);
      }
    });
  } else {
    finalImages = images;
  }

  let imagesGroup = "";
  finalImages.map((image, index) => {
    let imageName = Date.now() + index + ".png";
    let path = "./images/" + imageName;
    let imgdata = image.data_url;
    imagesGroup += imageName + ";";

    // to convert base64 format into random filename
    let base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");

    fs.writeFileSync(path, base64Data, { encoding: "base64" });
  });
  imagesGroup = imagesGroup.slice(0, -1);

  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const result = await getUsersById(userId);

      if (result.length == 0) {
        res.status(401).json({
          error: "This Gallery does not have images",
        });
      } else {
        // Add base64 image to each advertisement object
        const images = result[0].image_gallery;
        addGalleryImages("", userId, images, imagesGroup);
        if (id) {
          const company = await getCompaniesById(id);
          const companyImages = company[0].company_gallery;
          addGalleryImages(id, userId, companyImages, imagesGroup);
        }

        res.status(200).json({ message: "Image added to the gallery" });
      }
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "imageGallery" });
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

const getImageGallery = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;

  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      let result = [];
      if (id) {
        result = await getCompaniesById(id);
      } else {
        result = await getUsersById(userId);
      }

      if (result.length == 0) {
        res.status(401).json({
          error: "This gallery does not have images",
        });
      } else {
        // Add base64 image to each advertisement object
        const galleryWithImages = result.map((gallery) => {
          const images = [];
          let imageArray = [];
          if (gallery.company_gallery) {
            imageArray = gallery.company_gallery.split(";");
            imageArray.map((image) => {
              if (image) {
                images.push({
                  data_url: `${process.env.SERVER_IP}/images/${image}`,
                });
              }
            });
            return {
              ...gallery,
              company_gallery: images.length > 0 ? images : [],
            };
          } else if (gallery.image_gallery) {
            imageArray = gallery.image_gallery.split(";");
            imageArray.map((image) => {
              if (image) {
                images.push({
                  data_url: `${process.env.SERVER_IP}/images/${image}`,
                });
              }
            });
            return {
              ...gallery,
              company_gallery: images.length > 0 ? images : [],
            };
          }
        });

        res.status(200).json({
          galleryWithImages: galleryWithImages[0] ? galleryWithImages : [],
        });
      }
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "getImageGallery",
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

const clearUserNotifications = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { notifications, notificationId } = req.body;

  if (token) {
    try {
      if (notificationId) {
        updateNotificationStatus(notificationId);
      } else {
        notifications.map((notification) => {
          updateNotificationStatus(notification.id);
        });
      }

      res.status(200).json({
        message: "Notifications readed",
      });
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "clearUserNotifications",
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

const sendMessage = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const {
    sended_by,
    seller_id,
    buyer_id,
    advertisement_id,
    message,
    filesNames,
  } = req.body;

  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    let filesNamesString = "";
    try {
      const createdAt = new Date();
      const formattedCreatedAt = getFormattedDate(createdAt);

      if (filesNames) {
        filesNamesString = filesNames.join(";");
      }

      insertMessages(
        sended_by,
        seller_id,
        buyer_id,
        advertisement_id,
        message,
        formattedCreatedAt,
        filesNamesString
      );
      insertUserNotifications(
        userId == seller_id ? buyer_id : seller_id,
        "You have a new message",
        message,
        formattedCreatedAt,
        `/messages?key=${advertisement_id}${seller_id}${buyer_id}`,
        `${advertisement_id}${seller_id}${buyer_id}`
      );
      res.status(200).json({
        message: "MESSAGE SENDED",
      });
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "sendMessage" });
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

const removeGalleryImage = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { remove } = req.body;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const user = await getUsersById(userId);
      const userImages = user[0].image_gallery;
      let finalImages = [];
      if (userImages) {
        let oldImages = [];
        const imageArray = userImages.split(";");
        imageArray.map((image) => {
          if (image) {
            const imagePath = `${process.env.SERVER_IP}/images/${image}`;
            oldImages.push(imagePath);
          }
        });

        oldImages.map(async (oldImage, index) => {
          if (oldImage == remove.data_url) {
            const newImages = imageArray.filter(
              (item, index2) => index2 != index
            );
            let imageId = "";
            newImages.map((image) => {
              if (image) {
                imageId += image + ";";
              }
            });
            imageId = imageId.slice(0, -1);
            const response = await updateGalleryImage(imageId, userId);

            const imageName = remove.data_url.slice(-17);
            let filePath = `./images/${imageName}`;
            await fs.promises.unlink(filePath);
          }
        });
        res.send("Image deleted");
      } else {
        finalImages = images;
      }
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "removeGalleryImage",
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

const rateBuyer = asyncHandler(async (req, res) => {
  const { buyer_id, company_id, contract_id, rating, comments } = req.body;

  try {
    let currentRating = 0;
    let countRatings = 0;
    let newRating = 0;

    const contract = await getContractById(contract_id);
    const buyerRatings = await getBuyerRating(buyer_id, company_id);
    buyerRatings.map((rating) => {
      countRatings++;
      currentRating += rating.rating;
    });
    if (countRatings > 0) {
      newRating = (rating + currentRating) / (countRatings + 1);
    } else {
      newRating = rating;
    }
    insertBuyerRating(buyer_id, company_id, contract[0], comments, rating);
    if (company_id) {
      updateCompanyRating(buyer_id, company_id, newRating);
    } else {
      updateUserRating(buyer_id, newRating);
    }
    updateContractRatingStatus(contract_id, 1, contract[0].is_rated_by_buyer);
    res.status(200).json({
      message: "listing rated successfully",
    });
  } catch (error) {
    logger.error(error.message, { endpoint: "rateBuyer" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const rateSeller = asyncHandler(async (req, res) => {
  const { seller_id, company_id, contract_id, rating, comments } = req.body;

  try {
    let currentRating = 0;
    let countRatings = 0;
    let newRating = 0;
    let currentListingRating = 0;
    let countListingRatings = 0;
    let newListingRating = 0;

    const contract = await getContractById(contract_id);
    const listingId = contract[0].advertisement_id;
    const sellerRatings = await getSellersRating(seller_id, company_id);

    sellerRatings.map((rating) => {
      countRatings++;
      currentRating += rating.rating;
      if (rating.advertisement_id == listingId) {
        countListingRatings++;
        currentListingRating += rating.rating;
      }
    });

    if (countRatings > 0) {
      newRating = (rating + currentRating) / (countRatings + 1);
    } else {
      newRating = rating;
    }

    if (countListingRatings > 0) {
      newListingRating =
        (rating + currentListingRating) / (countListingRatings + 1);
    } else {
      newListingRating = rating;
    }

    insertSellerRating(seller_id, company_id, contract[0], comments, rating);
    if (company_id) {
      updateCompanyRating(seller_id, company_id, newRating);
    } else {
      updateUserRating(seller_id, newRating);
    }
    updateContractRatingStatus(contract_id, contract[0].is_rated_by_seller, 1);
    updateListingRate(listingId, newListingRating);
    res.status(200).json({
      message: "listing rated successfully",
    });
  } catch (error) {
    logger.error(error.message, { endpoint: "rateSeller" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const addSocialMediaInfo = asyncHandler(async (req, res) => {
  const { plataform, followers } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    await addPlataformsAndFollowers(userId, plataform, followers);
    res.status(200).json({
      message: "Plataform added successfully",
    });
  } catch (error) {
    logger.error(error.message, {
      userId: userId,
      endpoint: "addSocialMediaInfo",
    });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const addAudiencePreference = asyncHandler(async (req, res) => {
  const { preference } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    await addPreference(userId, preference);
    res.status(200).json({
      message: "Preference added successfully",
    });
  } catch (error) {
    logger.error(error.message, {
      userId: userId,
      endpoint: "addAudiencePreference",
    });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const getSocialMediaInfo = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const response = await getUsersById(id ? id : userId);
    if (response.length > 0) {
      const user = response[0];

      if (user.plataforms) {
        const plataformsArray = user.plataforms.slice(0, -1).split(";");
        const followersArray = user.followers.slice(0, -1).split(";");

        const data = plataformsArray.map((plataform, index) => {
          const followers = followersArray[index];
          return { name: plataform, amount: followers };
        });
        res.status(200).json({ data: data });
        return;
      }
    }
    res.status(200).json({ data: [] });
  } catch (error) {
    logger.error(error.message, { endpoint: "getSocialMediaInfo" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});
const getAudiencePreference = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const response = await getUsersById(id ? id : userId);
    if (response.length > 0) {
      const user = response[0];

      if (user.audience_preference) {
        const preferencesArray = user.audience_preference
          .slice(0, -1)
          .split(";");

        res.status(200).json({ data: preferencesArray });
        return;
      }
      res.status(200).json({ data: [] });
      return;
    }
    res.status(200).json({ data: [] });
  } catch (error) {
    logger.error(error.message, { endpoint: "getAudiencePreference" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});
const removeAudiencePreference = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { preferenceId } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const response = await getUsersById(userId);
    if (response.length > 0) {
      const user = response[0];

      const preferences = user.audience_preference?.slice(0, -1);

      if (preferences) {
        await removePreference(userId, preferenceId);
        res.status(200).json({ message: "Preference removed!" });
        return;
      }
    }
  } catch (error) {
    logger.error(error.message, { endpoint: "removeAudiencePreference" });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});
const removePlataform = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { plataformId } = req.body;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    const response = await getUsersById(userId);
    if (response.length > 0) {
      const user = response[0];

      const plataformsArray = user.plataforms?.slice(0, -1).split(";");
      const followersArray = user.followers?.slice(0, -1).split(";");
      if (plataformsArray.length > 0) {
        let newPlataforms = "";
        let plataformPosition = null;
        plataformsArray.forEach((plataform, index) => {
          if (plataform != plataformId) {
            newPlataforms += plataform + ";";
          } else {
            plataformPosition = index;
          }
        });

        followersArray.splice(plataformPosition, 1);
        let newFollowers = "";
        if (followersArray.length > 0) {
          newFollowers = followersArray.join(";") + ";";
        }

        await removePlataformAndFollowers(userId, newPlataforms, newFollowers);
        res.status(200).json({ message: "Plataform removed!" });
        return;
      }
    }
  } catch (error) {
    logger.error(error.message, {
      userId: userId,
      endpoint: "removePlataform",
    });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

const setIsContentCreator = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { isContentCreator } = req.body;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    const response = await setIsContentCreatorById(userId, isContentCreator);

    res.status(200).json({ data: true });
  } catch (error) {
    logger.error(error.message, {
      userId: userId,
      endpoint: "setIsContentCreator",
    });
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

export {
  authUser,
  registerUser,
  logoutUser,
  getSellerProfile,
  createUserConnectAccount,
  createCompanyConnectAccount,
  autoLogin,
  getExternalAccount,
  getUserProfile,
  updateUserProfileImage,
  updateUserProfile,
  getMyNotifications,
  resetPassword,
  sendResetPasswordEmail,
  changePassword,
  contactUs,
  addCompany,
  getCompanies,
  getCompany,
  imageGallery,
  getImageGallery,
  clearUserNotifications,
  testRoute,
  sendMessage,
  removeGalleryImage,
  removeCompany,
  rateBuyer,
  rateSeller,
  editCompany,
  addSocialMediaInfo,
  getSocialMediaInfo,
  setIsContentCreator,
  addAudiencePreference,
  getAudiencePreference,
  removeAudiencePreference,
  removePlataform,
};
