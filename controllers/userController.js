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

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const sql = `SELECT * FROM users WHERE email = '${email}'`;

  database.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length == 0) {
      res
        .status(400)
        .json({ message: "This email isn't registered,please Sign up." });
    } else {
      const hashPass = result[0].password;
      const userId = result[0].id;
      const firstName = result[0].first_name;
      const lastName = result[0].last_name;

      let image = "";
      if (result[0].profile_image) {
        const nameImage = {
          image: result[0].profile_image,
        };
        image = getImageBase64(nameImage);
      }
      bcrypt.compare(password, hashPass).then(function (result) {
        if (result) {
          generateToken(res, userId, firstName + " " + lastName, email);
          res.status(201).json({
            name: firstName,
            image: image,
            userId: userId,
          });
        } else {
          res.status(401).json({ message: "Wrong password" });
          // throw new Error('Invalid email or password');
        }
      });
    }
  });
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, firstName, lastName, phone, email, accountType, password } =
    req.body;
  const sql = `SELECT * FROM users WHERE email = '${email}'`;
  database.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res
        .status(401)
        .json({ error: "User already exist. Please use a diferent email" });
    } else {
      bcrypt.hash(password, 10).then(function (hashedPass) {
        // Store hash in your password DB.
        database.query(
          "INSERT INTO users (name,first_name,last_name,mobile_number,email,user_type, password,profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?,?)",
          [
            name,
            firstName,
            lastName,
            phone,
            email,
            accountType,
            hashedPass,
            "",
          ],
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
      const decoded = jwt.verify(token, 'usersecrettoken');
      const sql = `SELECT * FROM sellers WHERE user_id = '${decoded.userId}'`;
      database.query(sql, (err, result) => {
        if (err) throw err;
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

const updateUserAddress = asyncHandler(async (req, res) => {
  const stripe = new Stripe('sk_test_51Hz3inL3Lxo3VPLop5yMlq0Ov3D9Az2pTd8KJoj6h6Kk6PxFa08IwdTYhP0oa1Ag4aijQNRqWaDicDawyaAYRbTm00imWxlHre');
  const { address } = pkg;

  const { idNumber, bod, street, city, state, zip } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, 'usersecrettoken');
  const userId = decoded.userId;

  const updatedAt = new Date();
  const formattedUpdatedAt = updatedAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const sql = `SELECT * FROM users WHERE id = '${userId}'`;
  database.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      const query = `
          UPDATE users SET
            personal_id = '${idNumber}',
            birthdate = '${bod.substring(0, 10)}',
            address1 = '${street}',
            city = '${city}',
            state = '${state}',
            postcode = '${zip}',
            updated_at = '${formattedUpdatedAt}'
          WHERE id = ${userId}
        `;

      database.query(query, (err, results) => {
        if (err) {
          console.error("Error updating advertisement in MySQL database:", err);
          res.status(500).json({
            error: "An error occurred while updating the advertisement.",
          });
          return;
        }

        createAccount(result[0]);
      });
    } else {
      res.status(400).json({ error: "User does't  exists" });
    }
  });

  async function createAccount(user) {
    const { idNumber, bod, street, city, state, zip } = req.body;

    var currentDate = new Date();
    var timeStampCurrentDate = Math.floor(currentDate.getTime() / 1000);

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
        //save account info
        const query = `
        INSERT INTO sellers (
          user_id,
          stripe_account,
          created_at
        ) VALUES (
          '${userId}',
          '${account.id}',
          '${formattedCreatedAt}'
        )
      `;
        database.query(query, (err, results) => {
          if (err) {
            console.log("Error saving information to MySQL database:", err);
            res.status(500).json({
              error: "An error occurred while saving the information.",
            });
            return;
          }

          res.status(200).json({ account: account.id });
        });
      } else {
        res.status(400).json({ error: account });
      }
    } catch (error) {
      if (error.message.includes("is not a valid phone number")) {
        res
          .status(400)
          .json({
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

const autoLogin = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'usersecrettoken');
      const sql = `SELECT * FROM users WHERE id = '${decoded.userId}'`;
      database.query(sql, (err, result) => {
        if (err) throw err;
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
          console.log('name',firstName)
          console.log('usrid',result[0].id)
          res.status(200).json({
            name: firstName,
            image: image,
            userId: result[0].id,
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

const getExternalAccount = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'usersecrettoken');
      const sql = `SELECT * FROM sellers WHERE user_id = '${decoded.userId}'`;
      database.query(sql, (err, result) => {
        if (err) throw err;
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

const getUserProfile = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { id } = req.body;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'usersecrettoken');
      const sql = `SELECT * FROM users WHERE id = '${
        id ? id : decoded.userId
      }'`;
      database.query(sql, (err, result) => {
        if (err) throw err;
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
            profession
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

const updateUserProfileImage = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { image } = req.body;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'usersecrettoken');

      const imageName = Date.now() + ".png";
      const path = "./images/" + imageName;
      const imgdata = image;

      // to convert base64 format into random filename
      const base64Data = imgdata.replace(/^data:image\/\w+;base64,/, "");

      fs.writeFileSync(path, base64Data, { encoding: "base64" });

      const sql = `UPDATE users set profile_image = '${imageName}' WHERE id = ${decoded.userId}`;
      database.query(sql, (err, result) => {
        if (err) throw err;
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

const updateUserProfile = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { name, lastName, email, phone, bio,sex,profession } = req.body;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'usersecrettoken');

      const sql = `UPDATE users set 
      name = '${name} ${lastName}', 
      first_name = '${name}', 
      last_name = '${lastName}', 
      email = '${email}', 
      mobile_number = '${phone}', 
      bio = "${bio}" ,
      sex = "${sex}" ,
      profession = "${profession}"
      WHERE id = ${decoded.userId}`;
      database.query(sql, (err, result) => {
        if (err) throw err;
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
      const decoded = jwt.verify(token, 'usersecrettoken');
      const sql = `SELECT * FROM notifications WHERE user_id = '${decoded.userId}' and readed = 0`;
      database.query(sql, (err, result) => {
        if (err) throw err;
        console.log('notifications',decoded.userId)
        res.status(200).json({
          notifications: result,
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

const resetPassword = asyncHandler(async (req, res) => {
  const { password, email } = req.body;
  const sql = `SELECT * FROM users WHERE email = '${email}'`;
  database.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length == 0) {
      res.status(401).json({ error: "User do not exist, please sign up" });
    } else {
      bcrypt.hash(password, 10).then(function (hashedPass) {
        // Store hash in your password DB.
        const updatePassword = `UPDATE users set 
        password = '${hashedPass}' 
        WHERE email = '${email}'`;
        database.query(updatePassword, (err, result) => {
          if (err) {
            res
              .status(401)
              .json({ error: "Something went wrong, please try again" });
            return;
          }
          res.status(200).json({ message: "Password changed successfuly" });
        });
      });
    }
  });
});
const changePassword = asyncHandler(async (req, res) => {
  const { newPassword, current } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, 'usersecrettoken');
  const userId = decoded.userId;

  const getUser = `SELECT * FROM users WHERE id = '${userId}'`;
  database.query(getUser, (err, result) => {
    if (err) throw err;
    if (result.length == 0) {
      res.status(401).json({ error: "User do not exist, please sign up" });
    } else {
      bcrypt.compare(current, result[0].password).then(function (result) {
        if (result) {
          bcrypt.hash(newPassword, 10).then(function (hashedPass) {
            // Store hash in your password DB.
            const updatePassword = `UPDATE users set 
              password = '${hashedPass}' 
              WHERE id = '${userId}'`;
            database.query(updatePassword, (err, result) => {
              if (err) {
                res
                  .status(401)
                  .json({ error: "Something went wrong, please try again" });
                return;
              }
              res.status(200).json({ message: "Password changed successfuly" });
            });
          });
        } else {
          res.status(401).json({ error: "The current password does not match" });
          // throw new Error('Invalid email or password');
        }
      });
    }
  });
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
  const { name,email,number,message} = req.body;
  const createdAt = new Date();
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");



  const contactUsQuery = `
  INSERT INTO adex.contact_us (
    name,
    email,
    phone,
    message,
    created_at
  ) VALUES (
    '${name}',
    '${email}',
    '${number}',
    '${message}',
    '${formattedCreatedAt}'
  )`;  
  console.log(contactUsQuery)
  database.query(contactUsQuery, (err, result) => {
    if (err) {
      res.status(401).json({ error: err });
    };

      //put the adex email account
  sendEmail(
    'eduardosanchezcidron@gmail.com',
    "Customer Service",
    `${name} has sended the fallowing message :
    ${message}
    `
  );
    res.status(200).json({ message:'Message sended successfuly' });
  });
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
  contactUs
};
