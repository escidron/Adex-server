import asyncHandler from "express-async-handler";
import database from ".././db.js";
import Stripe from "stripe";
import jwt from "jsonwebtoken";

//not use anymore
// const CreateSubscribing = asyncHandler(async (req, res) => {
//   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
//   const { productName, productPrice, interval } = req.body;
//   const token = req.cookies.jwt;
//   const decoded = jwt.verify(token, process.env.JWT_SECRET);
//   const userId = decoded.userId;

//   let customerId = "";
//   console.log("entrou no create subcibin");

//   const checkCustomerExist = `SELECT * FROM adax.buyers where user_id = ${userId}`;
//   database.query(checkCustomerExist, (err, results) => {
//     console.log("entrou na qury");
//     if (err) {
//       console.log("Error getting information to MySQL database:", err);
//       res.status(500).json({
//         error: "An error occurred while saving the information.",
//       });
//       return;
//     }
//     if (results.length > 0) {
//       customerId = results[0].customer_id;
//     }
//     createsubscription();
//     console.log("results", results);
//   });

//   async function createsubscription() {
//     const product = await stripe.products.create({
//       name: productName,
//     });
//     console.log("product", product);

//     const price = await stripe.prices.create({
//       unit_amount: productPrice * 100,
//       currency: "USD",
//       recurring: { interval: interval },
//       product: product.id,
//     });
//     console.log("price", price);

//     const subscription = await stripe.subscriptions.create({
//       customer: customerId,
//       items: [{ price: price.id }],
//       payment_settings: {
//         payment_method_types: ["card"],
//       },
//     });
//     console.log("subscription", subscription);
//   }

//   res.status(200).json({ message: "subcription created" });
// });

const CreateCustomer = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  //get userID
  const { cardId, cardNumber, exp_year, exp_month, nameOnCard, brand } =
    req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  const fullName = decoded.fullName;
  const email = decoded.email;

  const createdAt = new Date();
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  let customerId = "";

  //save card
  const queryCards = `
    INSERT INTO cards (
      user_id,
      stripe_payment_method_id,
      card_brand,
      name,
      card_number,
      expiry_date,
      is_default,
      is_active,
      created_at
    ) VALUES (
      '${userId}',
      '${cardId}',
      '${brand}',
      '${nameOnCard}',
      '${cardNumber}',
      STR_TO_DATE(CONCAT(${exp_year}, '-', ${exp_month}, '-01'), '%Y-%m-%d'),
      '1',
      '1',
      '${formattedCreatedAt}'

    )
  `;
  database.query(queryCards, (err, results) => {
    if (err) {
      console.log("Error saving information to MySQL database:", err);
      res.status(500).json({
        error: "An error occurred while saving the information.",
      });
      return;
    }
  });

  const queryUpDateDefaultCard = `
    UPDATE cards
    SET is_default = 0
    WHERE user_id = ${userId}
    AND stripe_payment_method_id <> '${cardId}'
`;
  database.query(queryUpDateDefaultCard, (err, results) => {
    if (err) {
      console.log("Error saving information to MySQL database:", err);
      res.status(500).json({
        error: "An error occurred while saving the information.",
      });
      return;
    }
  });

  //check if the customer exist
  const checkCustomerExist = `SELECT * FROM adax.buyers where user_id = ${userId}`;
  database.query(checkCustomerExist, (err, results) => {
    if (err) {
      console.log("Error getting information to MySQL database:", err);
      res.status(500).json({
        error: "An error occurred while saving the information.",
      });
      return;
    }
    if (results.length > 0) {
      customerId = results[0].customer_id;
    }
    createCustomer();
    console.log("results", results);
  });
  //save customer

  console.log("customerId", customerId);

  async function createCustomer() {
    if (customerId != "") {
      console.log("entrou no customer id");
      console.log("entrou no update");

      const paymentMethod = await stripe.paymentMethods.attach(cardId, {
        customer: customerId,
      });

      const customerUpdated = await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: cardId,
        },
      });

      const queryCustomers = `
        UPDATE adax.buyers
        SET default_card = '${cardId}'
        WHERE user_id = ${userId}
      `;
      saveCustomer(queryCustomers);
    } else {
      console.log("entrou no create");

      const customer = await stripe.customers.create({
        description: fullName,
        email: email,
        test_clock: "clock_1NQjW3EPsNRBDePl9v0CssKX",
      });

      customerId = customer.id;
      const paymentMethod = await stripe.paymentMethods.attach(cardId, {
        customer: customerId,
      });

      const customerUpdated = await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: cardId,
        },
      });

      const queryCustomers = `
          INSERT INTO buyers (
            user_id,
            customer_id,
            name,
            email,
            created_at,
            default_card
          ) VALUES (
            '${userId}',
            '${customer.id}',
            '${fullName}',
            '${email}',
            '${formattedCreatedAt}',
            '${cardId}'
    
          )
        `;

      saveCustomer(queryCustomers);
    }
  }

  //Storage card informations
  function saveCustomer(queryCustomers) {
    database.query(queryCustomers, (err, results) => {
      if (err) {
        console.log("Error saving information to MySQL database:", err);
        res.status(500).json({
          error: "An error occurred while saving the information.",
        });
        return;
      }
      res.status(200).json({
        message: "Payment method saved successfully.",
      });
    });
  }
});

const CreateExternalBankAccount = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  //get userID
  const { routingNumber, accountNumber, stripeAccount, bankAccountName } =
    req.body;
  console.log("entrouuuuu");
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const createdAt = new Date();
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  console.log(stripeAccount);
  try {
    const bankAccount = await stripe.accounts.createExternalAccount(
      stripeAccount,
      {
        external_account: {
          object: "bank_account",
          country: "BR",
          currency: "brl",
          account_number: accountNumber, //'0001234',
          routing_number: routingNumber, //'110-0000'
        },
      }
    );

    const query = `
    INSERT INTO external_bank_accounts (
      user_id,
      routing_number,
      account_number,
      external_account_id,
      bank_name,
      is_default,
      is_active,
      created_at
    ) VALUES (
      '${userId}',
      '${routingNumber}',
      '${accountNumber}',
      '${bankAccount.id}',
      '${bankAccountName}',
      '1',
      '1',
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
    });

    // update the default account
    const queryUpdate = `
  UPDATE external_bank_accounts
  SET updated_at = '${formattedCreatedAt}',
  is_default = CASE
  WHEN external_account_id <> '${bankAccount.id}' THEN 0
  WHEN external_account_id = '${bankAccount.id}' THEN 1
  END
  WHERE user_id = ${userId}
`;
    database.query(queryUpdate, (err, results) => {
      if (err) {
        console.log("Error saving information to MySQL database:", err);
        res.status(500).json({
          error: "An error occurred while saving the information.",
        });
        return;
      }
    });
    // update the default account in the seller table
    const queryUpdateSeller = `
  UPDATE sellers
  SET 
  updated_at = '${formattedCreatedAt}',
  external_account_id = '${bankAccount.id}'
  WHERE user_id = ${userId}
`;
    database.query(queryUpdateSeller, (err, results) => {
      if (err) {
        console.log("Error saving information to MySQL database:", err);
        res.status(500).json({
          error: "An error occurred while saving the information.",
        });
        return;
      }
      res.status(200).json({ message: "Bank account created" });
    });
  } catch (error) {
    console.log("error", error.message);
    res.status(400).json({ error: error.message });
  }

  //save card
});

const GetCards = asyncHandler(async (req, res) => {
  console.log("cards router");
  //get user id
  const token = req.cookies.jwt;
  console.log("token", token);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  if (token) {
    console.log("token");
    try {
      const sql = `SELECT * FROM adax.cards where user_id = ${userId}`;
      database.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);
        res.status(200).json({
          data: result,
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

const GetBankAccounts = asyncHandler(async (req, res) => {
  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  if (token) {
    try {
      const sql = `SELECT * FROM adax.external_bank_accounts where user_id = ${userId}`;
      database.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);
        res.status(200).json({
          data: result,
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

const SetDefaultCard = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  //get userID
  const { cardId } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const upuatedAt = new Date();
  const formattedUpdatedAt = upuatedAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  let customerId = "";

  //save card

  const queryUpDateDefaultCard = `
    UPDATE cards
    SET updated_at = '${formattedUpdatedAt}',
    is_default = CASE
    WHEN stripe_payment_method_id <> '${cardId}' THEN 0
    WHEN stripe_payment_method_id = '${cardId}' THEN 1
    END
    WHERE user_id = ${userId}
     
`;
  console.log("QURYYYYY", queryUpDateDefaultCard);
  database.query(queryUpDateDefaultCard, (err, results) => {
    if (err) {
      console.log("Error saving information to MySQL database:", err);
      res.status(500).json({
        error: "An error occurred while saving the information.",
      });
      return;
    }
  });

  //check if the customer exist
  const checkCustomerExist = `SELECT * FROM adax.buyers where user_id = ${userId}`;
  database.query(checkCustomerExist, (err, results) => {
    if (err) {
      console.log("Error getting information to MySQL database:", err);
      res.status(500).json({
        error: "An error occurred while saving the information.",
      });
      return;
    }
    if (results.length > 0) {
      customerId = results[0].customer_id;
    }
    createCustomer();
    console.log("results", results);
  });
  //save customer

  async function createCustomer() {
    if (customerId != "") {
      const paymentMethod = await stripe.paymentMethods.attach(cardId, {
        customer: customerId,
      });

      const customerUpdated = await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: cardId,
        },
      });

      const queryCustomers = `
        UPDATE adax.buyers
        SET default_card = '${cardId}',updated_at= '${formattedUpdatedAt}'
        WHERE user_id = ${userId}
      `;
      saveCustomer(queryCustomers);
    }
  }

  //Storage card informations
  function saveCustomer(queryCustomers) {
    database.query(queryCustomers, (err, results) => {
      if (err) {
        console.log("Error saving information to MySQL database:", err);
        res.status(500).json({
          error: "An error occurred while saving the information.",
        });
        return;
      }
      res.status(200).json({
        message: "Default payment method saved successfully.",
      });
    });
  }
});

const SetDefaultBank = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  //get userID
  const { bankId } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const upuatedAt = new Date();
  const formattedUpdatedAt = upuatedAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  console.log("bankId", bankId);

  // get the seller account
  const queryGetSellerAccount = `
    SELECT * FROM sellers WHERE user_id = ${userId}
  `;
  database.query(queryGetSellerAccount, (err, results) => {
    if (err) {
      console.log("Error saving information to MySQL database:", err);
      res.status(500).json({
        error: "An error occurred while saving the information.",
      });
      return;
    }
    const account = results[0].stripe_account;
    upDateDefaultBank(account);
    // res.status(200).json({ message: "default bank changed" });
  });

  async function upDateDefaultBank(account) {
    const bankAccount = await stripe.accounts.updateExternalAccount(
      account,
      bankId,
      { default_for_currency: true }
    );
    console.log("bankAccount", bankAccount);
    if (account) {
      const queryUpDateDefaultBank = `
      UPDATE external_bank_accounts
      SET updated_at = '${formattedUpdatedAt}',
      is_default = CASE
      WHEN external_account_id <> '${bankId}' THEN 0
      WHEN external_account_id = '${bankId}' THEN 1
      END
      WHERE user_id = ${userId} 
  `;
      database.query(queryUpDateDefaultBank, (err, results) => {
        if (err) {
          console.log("Error saving information to MySQL database:", err);
          res.status(500).json({
            error: "An error occurred while saving the information.",
          });
          return;
        }
        console.log(results);
      });

      // update the default account in the seller table
      const queryUpdateSeller = `
        UPDATE sellers
        SET 
        updated_at = '${formattedUpdatedAt}',
        external_account_id = '${bankId}'
        WHERE user_id = ${userId}
      `;
      database.query(queryUpdateSeller, (err, results) => {
        if (err) {
          console.log("Error saving information to MySQL database:", err);
          res.status(500).json({
            error: "An error occurred while saving the information.",
          });
          return;
        }
        res.status(200).json({ message: "default bank changed" });
      });
    } else {
      res.status(500).json({
        error: "An error occurred while saving the information.",
      });
    }
  }
});

const CreatePaymentIntent = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  //get userID
  console.log("payment intent");
  const { data, start_date, duration } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const createdAt = new Date();
  const formattedUpdatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const startDate = new Date(start_date.substring(0, 10));
  const startDateFormatted = startDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  let endDate = new Date(startDate);

  if (data.ad_duration_type == "1") {
    endDate.setMonth(startDate.getMonth() + duration);
  } else if (data.ad_duration_type == "2") {
    endDate.setMonth(startDate.getMonth() + duration * 3);
  } else if (data.ad_duration_type == "3") {
    endDate.setFullYear(startDate.getFullYear() + duration);
  }
  endDate = endDate.toISOString().substring(0, 10);

  endDate = new Date(endDate);
  const endDateFormatted = endDate.toISOString().slice(0, 19).replace("T", " ");

  var timeStampEndDate = Math.floor(endDate.getTime() / 1000);
  var timeStampStartDate = Math.floor(startDate.getTime() / 1000);
  console.log("timeStampStartDate", timeStampStartDate);
  let sellerAccount = "";
  //get the seller connected stripe account
  const querySellers = `SELECT * FROM adax.sellers where user_id = ${data.created_by}`;
  database.query(querySellers, (err, result) => {
    if (err) throw err;

    sellerAccount = result[0].stripe_account;
  });

  //get the buyer info
  const query = `SELECT * FROM adax.buyers where user_id = ${data.requested_by?data.requested_by:userId}`;
  database.query(query, (err, result) => {
    if (err) throw err;
    const paymentMethod = result[0].default_card;
    const customerId = result[0].customer_id;
    const customerEmail = result[0].email;
    connectCustomer(paymentMethod, customerId, customerEmail);
  });

  async function connectCustomer(paymentMethod, customerId, customerEmail) {
    console.log("data", data);
    // const subscription = await stripe.subscriptions.create({
    //   customer: customerId,
    //   items: [{ price: data.stripe_price }],
    //   payment_settings: {
    //     payment_method_types: ["card"],
    //   },
    //   transfer_data: {
    //     destination: sellerAccount,
    //   },
    //   billing_cycle_anchor:timeStampStartDate,
    //   cancel_at: timeStampEndDate,
    //   application_fee_percent: 10,
    // });

    const subscription = await stripe.subscriptionSchedules.create({
      customer: customerId,
      start_date: timeStampStartDate,
      end_behavior: "cancel",
      phases: [
        {
          items: [
            {
              price: data.stripe_price,
              quantity: 1,
            },
          ],
          end_date: timeStampEndDate,

          transfer_data: {
            destination: sellerAccount,
          },
          application_fee_percent: 10,
        },
      ],
    });

    console.log("subscription", subscription);
    if (subscription.id) {
      const query = `
      INSERT INTO contracts (
        subscription_id,
        seller_id,
        buyer_id,
        advertisement_id,
        contract_status,
        start_date,
        end_date,
        created_at
      ) VALUES (
        '${subscription.id}',
        '${sellerAccount}',
        '${customerId}',
        '${data.id}',
        '1',
        '${startDateFormatted}',
        '${endDateFormatted}',
        '${formattedUpdatedAt}'
      )
    `;
      console.log("queryyyy");
      database.query(query, (err, results) => {
        if (err) {
          console.log("Error saving information to MySQL database:", err);
          res.status(500).json({
            error: "An error occurred while saving the information.",
          });
        }
      });

      const queryUpDateAdStatus = `
        UPDATE advertisement
        SET status = 2
        WHERE id = ${data.id}
    `;
      database.query(queryUpDateAdStatus, (err, results) => {
        if (err) {
          console.log("Error saving information to MySQL database:", err);
          res.status(500).json({
            error: "An error occurred while saving the information.",
          });
        }
        res.status(200).json({ message: "subscription created successfuly" });
      });
    }
  }
});

const RequestReserve = asyncHandler(async (req, res) => {
  console.log("request reserve");
  const { data, start_date, duration } = req.body;

  //get user id
  const token = req.cookies.jwt;
  console.log("token", token);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const startDate = new Date(start_date.substring(0, 10));
  const startDateFormatted = startDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

    let endDate = new Date(startDate);

    if (data.ad_duration_type == "1") {
      endDate.setMonth(startDate.getMonth() + duration);
    } else if (data.ad_duration_type == "2") {
      endDate.setMonth(startDate.getMonth() + duration * 3);
    } else if (data.ad_duration_type == "3") {
      endDate.setFullYear(startDate.getFullYear() + duration);
    }
    endDate = endDate.toISOString().substring(0, 10);
  
    endDate = new Date(endDate);
    const endDateFormatted = endDate.toISOString().slice(0, 19).replace("T", " ");

  if (token) {
    try {
      const queryUpDateAdStatus = `
        UPDATE advertisement
        SET 
        status = 4,
        start_date = '${startDateFormatted}',
        end_date = '${endDateFormatted}',
        duration = ${duration},
        requested_by = ${userId}
        WHERE id = ${data.id}
    `;
    console.log(queryUpDateAdStatus)
      database.query(queryUpDateAdStatus, (err, result) => {
        if (err) throw err;
        console.log(result);
        res.status(200).json({
          data: result,
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
export {
  // CreateSubscribing,
  CreateCustomer,
  GetCards,
  SetDefaultCard,
  CreateExternalBankAccount,
  GetBankAccounts,
  SetDefaultBank,
  CreatePaymentIntent,
  RequestReserve
};
