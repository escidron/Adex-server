import asyncHandler from "express-async-handler";
import database from ".././db.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import * as fs from "fs";
import getImageBase64 from "../utils/getImageBase64.js";
import pkg from "ip";
import sendEmail from "../utils/sendEmail.js";
import { signUpTamplate } from "../utils/emailTamplates/signUp.js";
import { getCompaniesQuery, getCompanyQuery } from "../queries/Companies.js";
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
} from "../queries/Users.js";
import {
  insertCompany,
  getCompaniesById,
  addCompanyImagesQuery,
} from "../queries/Companies.js";

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
      const nameImage = {
        image: result[0].profile_image,
      };
      image = getImageBase64(nameImage);
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
          });
        } else {
          const externalAccount = resultSeller[0].external_account_id;
          if (externalAccount) {
            res.status(201).json({
              name: firstName,
              image: image,
              userId: userId,
              hasPayout: externalAccount,
            });
          } else {
            res.status(201).json({
              name: firstName,
              image: image,
              userId: userId,
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
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const result = await getUsersById(userId);
      if (result.length == 0) {
        res.status(400).json({
          error: "User does not exists",
        });
      } else {
        const firstName = result[0].first_name;
        const nameImage = {
          image: result[0].profile_image,
        };
        let image = "";
        if (result[0].profile_image) {
          image = getImageBase64(nameImage);
        }
        res.status(200).json({
          name: firstName,
          image: image,
          userId: result[0].id,
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

const registerUser = asyncHandler(async (req, res) => {
  const { name, firstName, lastName, phone, email, accountType, password } =
    req.body;

  const result = getUsersByEmail(email);
  if (result.length > 0) {
    res
      .status(401)
      .json({ error: "User already exist. Please use a diferent email" });
  } else {
    bcrypt.hash(password, 10).then(function (hashedPass) {
      // Store hash in your password DB.
      database.query(
        "INSERT INTO users (name,first_name,last_name,mobile_number,email,user_type, password,profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?,?)",
        [name, firstName, lastName, phone, email, accountType, hashedPass, ""],
        (error, results, rows) => {
          if (error) {
            console.error(error);
            res.status(500).send("Server error");
          } else {
            const userId = results.insertId;
            generateToken(res, userId, firstName + " " + lastName, email);
            // send the email
            sendEmail(
              email,
              "User registered",
              "Welcome to Adex",
              signUpTamplate
            );

            res.status(200).json({
              name: firstName,
              userId: userId,
            });
          }
        }
      );
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
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const result = await getSeller(userId);
      if (result.length == 0) {
        res.status(200).json({
          account: "",
        });
      } else {
        const account = result[0].stripe_account;
        res.status(200).json({
          account: account,
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

const updateUserAddress = asyncHandler(async (req, res) => {
  const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
  );
  const { address } = pkg;
  const { idNumber, bod, street, city, state, zip } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const updatedAt = new Date();
  const formattedUpdatedAt = updatedAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const result = await getUsersById(userId);
  if (result.length > 0) {
    updateUserAddressInfo(
      idNumber,
      bod.substring(0, 10),
      street,
      city,
      state,
      zip,
      formattedUpdatedAt,
      userId
    );
    createAccount(result[0]);
  } else {
    res.status(400).json({ error: "User does't  exists" });
  }

  async function createAccount(user) {
    const { idNumber, bod, street, city, state, zip } = req.body;

    var currentDate = new Date();

    // create the account and enable the charge option
    try {
      const account = await stripe.accounts.create({
        type: "custom",
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: 7299,
          url: "www." + user.email.substring(0, user.email.indexOf("@")),
        },
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
            day: bod.substring(8, 10),
            month: bod.substring(5, 7),
            year: bod.substring(0, 4),
          },

          verification: {
            document: {
              front: "file_identity_document_success",
            },
          },
        },
      });

      const accountAccepted = await stripe.accounts.update(account.id, {
        tos_acceptance: {
          date: currentDate,
          ip: address(),
        },
      });

      const createdAt = new Date();
      const formattedCreatedAt = createdAt
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      if (account.id) {
        insertSeller(userId, account.id, formattedCreatedAt);
        res.status(200).json({ account: account.id });
      } else {
        res.status(400).json({ error: account });
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
  }
});

const getExternalAccount = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const result = await getSeller(userId);
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

const getUserProfile = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
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
        const user_type = result[0].user_type;
        const handle = result[0].handle;
        const handleIsPublic = result[0].handle_is_public;
        const professionIsPublic = result[0].profession_is_public;
        const sexIsPublic = result[0].sex_is_public;
        const bioIsPublic = result[0].bio_is_public;
        const city = result[0].city;
        const cityIsPublic = result[0].city_is_public;

        const nameImage = {
          image: result[0].profile_image,
        };
        let image = "";
        if (result[0].profile_image) {
          image = getImageBase64(nameImage);
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
          user_type,
          handle,
          handleIsPublic,
          professionIsPublic,
          sexIsPublic,
          bioIsPublic,
          city,
          cityIsPublic,
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

const updateUserProfileImage = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { image } = req.body;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const imageName = Date.now() + ".png";
      const path = "./images/" + imageName;
      const imgdata = image;
      // to convert base64 format into random filename
      const base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(path, base64Data, { encoding: "base64" });
      updateProfileImage(imageName, userId);
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
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
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

const getMyNotifications = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const result = await getUserNotifications(userId);
      res.status(200).json({
        notifications: result,
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
  sendEmail(
    email,
    "Reset password",
    `Your security code for reset your password is ${codeOTP}`
  );
  res.status(200).json({ message: "Email sended successfuly" });
});

const contactUs = asyncHandler(async (req, res) => {
  const { name, email, number, message } = req.body;
  const createdAt = new Date();
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  insertContactUs(name, email, number, message, formattedCreatedAt);

  //put the adex email account
  sendEmail(
    "eduardosanchezcidron@gmail.com",
    "Customer Service",
    `${name} has sended the fallowing message :
    ${message}
    `
  );
  res.status(200).json({ message: "Message sended successfuly" });
});

const addCompany = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { name, image, address, hasPhysicalSpace, industry } = req.body;

  const createdAt = new Date();
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const imageName = Date.now() + ".png";
      const path = "./images/" + imageName;
      const imgdata = image;
      // to convert base64 format into random filename
      const base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");

      fs.writeFileSync(path, base64Data, { encoding: "base64" });
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

const getCompanies = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const result = await getCompaniesQuery(userId);

      if (result.length > 0) {
        result.map((item, index) => {
          const nameImage = item.company_logo;
          let image = "";
          if (item.company_logo) {
            image = getImageBase64(nameImage);
            result[index].company_logo = image;
          }
        });
      }
      res.status(200).json(result);
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

const getCompany = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;
  if (token) {
    try {
      const result = await getCompaniesById(id);

      if (result.length > 0) {
        result.map((item, index) => {
          const nameImage = item.company_logo;
          let image = "";
          if (item.company_logo) {
            image = getImageBase64(nameImage);
            result[index].company_logo = image;
          }
        });
      }
      res.status(200).json(result);
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

const companyGallery = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id, images } = req.body;

  let imagesGroup = "";
  images.map((image, index) => {
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
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const result = await getCompaniesById(id);
      if (result.length == 0) {
        res.status(401).json({
          error: "This Company does not have images",
        });
      } else {
        // Add base64 image to each advertisement object
        const images = result[0].company_gallery;
        addCompanyImagesQuery(id, userId, images, imagesGroup);

        res.status(200).json({ message: "Image added to the gallery" });
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

const getCompanyGallery = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;

  if (token) {
    try {
      const result = await getCompaniesById(id);

      if (result.length == 0) {
        res.status(401).json({
          error: "This Company does not have images",
        });
      } else {
        // Add base64 image to each advertisement object
        const galleryWithImages = result.map((gallery) => {
          const images = [];

          if (gallery.company_gallery) {
            const imageArray = gallery.company_gallery.split(";");
            imageArray.map((image) => {
              if (image) {
                images.push({ data_url: getImageBase64(image) });
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
export {
  authUser,
  registerUser,
  logoutUser,
  getSellerProfile,
  updateUserAddress,
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
  companyGallery,
  getCompanyGallery,
};
