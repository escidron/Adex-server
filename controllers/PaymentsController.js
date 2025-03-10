import asyncHandler from "express-async-handler";
import database from ".././db.js";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import {
  insertCard,
  updateCard,
  insertAccount,
  updateAccount,
  getCard,
  getExternalAccount,
  insertContract,
  getContract,
  updateContract,
  getContractByStripeId,
  getContractBySub,
  updateContractInvoidePaid,
  updateContractSubscriptionId,
  updatePhaseDateContract,
  updateContractCancellationStatus,
  deleteExternalBankAccount,
  deleteCreditCard,
} from "../queries/Payments.js";
import {
  getBuyer,
  updateBuyer,
  insertBuyer,
  updateSeller,
  getSeller,
  insertUserNotifications,
  getUsersById,
} from "../queries/Users.js";
import {
  getAdvertisementById,
  updateAdvertismentById,
} from "../queries/Advertisements.js";
import dotenv from "dotenv";
import renderEmail from "../utils/emailTamplates/emailTemplate.js";
import getFormattedDate from "../utils/getFormattedDate.js";
import diferenceBetweenDates from "../utils/diferenceBetweenDates.js";
import logger from "../utils/logger.js";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CreateCustomer = asyncHandler(async (req, res) => {
  //get userID
  const { cardId, nameOnCard, companyId } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  const fullName = decoded.fullName;
  const email = decoded.email;

  const createdAt = new Date();
  const formattedCreatedAt = getFormattedDate(createdAt);
  let customerId = "";

  const buyer = await getBuyer(userId);

  let paymentMethods = "";
  let isDefault = true;
  if (buyer.length > 0) {
    const customertId = buyer[0].customer_id;
    paymentMethods = await stripe.paymentMethods.list({
      customer: customertId,
      type: "card",
    });
    isDefault = paymentMethods.data.length == 0;
  }

  insertCard(
    userId,
    cardId,
    nameOnCard,
    formattedCreatedAt,
    isDefault,
    companyId
  );

  const results = await getBuyer(userId, companyId);

  if (results.length > 0) {
    customerId = results[0].customer_id;
  }

  if (customerId != "") {
    const paymentMethod = await stripe.paymentMethods.attach(cardId, {
      customer: customerId,
    });

    const customerUpdated = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: cardId,
      },
    });

    updateBuyer(userId, cardId, companyId);
    
    const queryUpDateDefaultCard = `
    UPDATE cards
    SET updated_at = '${formattedCreatedAt}',
    is_default = CASE
    WHEN stripe_payment_method_id <> '${cardId}' THEN 0
    WHEN stripe_payment_method_id = '${cardId}' THEN 1
    END
    WHERE user_id = ${userId}
     
`;
    updateCard(queryUpDateDefaultCard);
  } else {
    const customer = await stripe.customers.create({
      description: fullName,
      email: email,
      //test_clock: "clock_1P5FJQL3Lxo3VPLolYyjc7Dp",
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

    insertBuyer(
      userId,
      customer,
      fullName,
      email,
      cardId,
      formattedCreatedAt,
      companyId
    );
  }

  res.status(200).json({
    message: "Payment method saved successfully.",
  });
});

const CreateExternalBankAccount = asyncHandler(async (req, res) => {
  //get userID
  const { routingNumber, accountNumber, stripeAccount, companyId } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const createdAt = new Date();
  const formattedCreatedAt = getFormattedDate(createdAt);

  try {
    const bankAccount = await stripe.accounts.createExternalAccount(
      stripeAccount,
      {
        external_account: {
          object: "bank_account",
          country: "US",
          currency: "usd",
          account_number: accountNumber, //'0001234',
          routing_number: routingNumber, //'110-0000'
        },
      }
    );

    const seller = await getSeller(userId);
    const accountId = seller[0].stripe_account;

    const bankAccounts = await stripe.accounts.listExternalAccounts(accountId, {
      object: "bank_account",
    });
    const isDefault = bankAccounts.data.length == 0;
    insertAccount(
      userId,
      bankAccount,
      formattedCreatedAt,
      isDefault,
      companyId
    );
    updateSeller(userId, bankAccount, formattedCreatedAt, companyId);

    // const query = `
    //   UPDATE advertisement SET
    //     status = '1',
    //     updated_at = '${formattedCreatedAt}'
    //   WHERE created_by = ${userId} and status = '0' ${
    //   companyId ? `and company_id = ${companyId}` : ""
    // }
    // `;
    // updateAdvertismentById(query);

    res.status(200).json({ message: "Bank account created" });
  } catch (error) {
    logger.error(error.message, {
      userId: userId,
      endpoint: "CreateExternalBankAccount",
    });
    res.status(500).json({
      error: error.message,
    });
  }

  //save card
});

const GetCards = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const { companyId } = req.body;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const storagedCards = await getCard(userId);

      const buyer = await getBuyer(userId, companyId);
      if (buyer.length > 0) {
        const customertId = buyer[0].customer_id;

        const paymentMethods = await stripe.paymentMethods.list({
          customer: customertId,
          type: "card",
        });
        const stripeCards = paymentMethods.data;
        const cards = stripeCards.map((card) => {
          const storagedCard = storagedCards.find(
            (item) => item.stripe_payment_method_id === card.id
          );

          if (storagedCard) {
            return {
              ...card,
              is_default: storagedCard.is_default,
              name_on_card: storagedCard.name,
            };
          }
          return card;
        });
        res.status(200).json({
          data: cards,
        });
      } else {
        res.status(200).json({
          data: [],
        });
      }
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "GetCards" });
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

const GetBankAccounts = asyncHandler(async (req, res) => {
  //get user id
  const token = req.cookies.jwt;
  const { companyId } = req.body;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const seller = await getSeller(userId, companyId);
      if (seller.length > 0) {
        const accountId = seller[0].stripe_account;
        const bankAccounts = await stripe.accounts.listExternalAccounts(
          accountId,
          { object: "bank_account" }
        );

        res.status(200).json(bankAccounts);
      } else {
        res.status(200).json({ data: [] });
      }
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "GetBankAccounts",
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

const SetDefaultCard = asyncHandler(async (req, res) => {
  const { cardId } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const updatedAt = new Date();
  const formattedUpdatedAt = getFormattedDate(updatedAt);
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
  updateCard(queryUpDateDefaultCard);

  const results = await getBuyer(userId);

  if (results.length > 0) {
    customerId = results[0].customer_id;
  }
  //save customer
  if (customerId != "") {
    const paymentMethod = await stripe.paymentMethods.attach(cardId, {
      customer: customerId,
    });

    const customerUpdated = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: cardId,
      },
    });
    updateBuyer(userId, cardId);

    res.status(200).json({
      message: "Default payment method saved successfully.",
    });
  }
});

const SetDefaultBank = asyncHandler(async (req, res) => {
  //get userID
  const { bankId } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const updatedAt = new Date();
  const formattedUpdatedAt = getFormattedDate(updatedAt);

  // get the seller account
  const results = await getSeller(userId);

  const account = results[0].stripe_account;

  const bankAccount = await stripe.accounts.updateExternalAccount(
    account,
    bankId,
    { default_for_currency: true }
  );

  if (account) {
    updateAccount(userId, bankId, formattedUpdatedAt);
    updateSeller(userId, bankId, formattedUpdatedAt);

    res.status(200).json({ message: "default bank changed" });
  } else {
    res.status(500).json({
      error: "An error occurred while saving the information.",
    });
  }
});

const CreatePaymentIntent = asyncHandler(async (req, res) => {
  const { data, current_discount, companyId } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const createdAt = new Date();
  const formattedUpdatedAt = getFormattedDate(createdAt);

  const startDate = new Date(data.date.from);
  const startDateFormatted = getFormattedDate(startDate);

  const endDate = new Date(data.date.to);
  const endDateFormatted = getFormattedDate(endDate);

  const diferencaInDays = diferenceBetweenDates(data.date.from);
  let billingStartDate;
  let billingEndDate;

  if (diferencaInDays >= 5) {
    billingStartDate = new Date();
    billingEndDate = new Date();

    billingStartDate.setDate(billingStartDate.getDate() + 6);
    billingEndDate.setDate(billingEndDate.getDate() + 6);

    if (data.ad_duration_type == "0") {
      billingEndDate.setMonth(billingEndDate.getMonth() + data.duration);
    } else {
      billingEndDate.setMonth(billingEndDate.getMonth() + 1);
    }
  } else {
    billingStartDate = new Date(data.date.from);
    billingEndDate = new Date(data.date.from);
    
    //add seven hours to prevent blocking payment by the bank
    billingStartDate.setHours(billingStartDate.getHours() + 7);
    billingEndDate.setHours(billingEndDate.getHours() + 7);

    //charge one day before start to prevent problems when payment fail and retry
    billingStartDate.setDate(billingStartDate.getDate() -1);
    billingEndDate.setDate(-1);

    if (data.ad_duration_type == "0") {
      billingEndDate.setMonth(billingEndDate.getMonth() + data.duration);
    } else {
      billingEndDate.setMonth(billingEndDate.getMonth() + 1);
    }
  }

  const timeStampFirstBill = Math.floor(billingStartDate.getTime() / 1000);
  const timeStampEndDate = Math.floor(billingEndDate.getTime() / 1000);
  //get the seller connected stripe account
  const result = await getSeller(data.created_by, data.company_id);
  const sellerAccount = result[0].stripe_account;

  //get the buyer info
  const results = await getBuyer(
    data.requested_by ? data.requested_by : userId,
    data.requested_by_company ? data.requested_by_company : companyId
  );

  const customerId = results[0].customer_id;

  let subscription = "";
  let coupon = "";

  try {
    if (current_discount > 0) {
      coupon = await stripe.coupons.create({
        percent_off: current_discount,
        duration: "forever",
      });
    }
    subscription = await stripe.subscriptionSchedules.create({
      customer: customerId,
      start_date: timeStampFirstBill,
      end_behavior: "cancel",
      metadata: {
        userId,
      },
      phases: [
        {
          items: [
            {
              price: data.stripe_price,
              quantity: data.ad_duration_type == "2" ? data.units : 1,
            },
          ],
          end_date: timeStampEndDate,
          coupon: coupon.id ? coupon.id : undefined,
          proration_behavior: "none",
          transfer_data: {
            destination: sellerAccount,
          },
          application_fee_percent: 10,
        },
      ],
    });
  } catch (error) {
    console.log(error);
    if (
      error.raw.message.includes(
        "You can not create a subscription schedule with `phases` that already ended"
      )
    ) {
      res.status(400).json({
        message: "The start date must be higer that the current date",
      });
    } else {
      res.status(400).json({ message: error.raw.message });
    }
    return;
  }

  if (subscription.id) {
    insertContract(
      subscription,
      sellerAccount,
      customerId,
      data,
      startDateFormatted,
      endDateFormatted,
      formattedUpdatedAt
    );

    const queryUpDateAdStatus = `
        UPDATE advertisement
        SET status = 2,
        start_date = '${startDateFormatted}',
        end_date = '${endDateFormatted}',
        duration = '${data.duration ? data.duration : 1}'
        WHERE id = ${data.id}
    `;
    updateAdvertismentById(queryUpDateAdStatus);
    insertUserNotifications(
      data.created_by == userId ? data.requested_by : data.created_by,
      data.created_by == userId ? "Booking Request accepted" : "Listing booked",
      data.created_by == userId
        ? "Your Booking request was accepted, see more details"
        : "One of your listing was booked, see more details",
      formattedUpdatedAt,
      data.created_by == userId
        ? `/my-booking/${data.id}`
        : `/listing/view/${data.id}`
    );

    ////////////////////////////////////////////////////////////////////////
    const createdByUser = await getUsersById(data.created_by);
    const sellerName = createdByUser[0].name;

    const requestedByUser = await getUsersById(data.requested_by);
    const buyerName = requestedByUser[0].name;
    const buyerEmail = requestedByUser[0].email;
    //send email to the seller
    const advertisement = await getAdvertisementById(data.id);
    const imageName = advertisement[0].image.split(";");
    if (createdByUser.length > 0) {
      const email = createdByUser[0].email;

      const emailData = {
        title: "ADEX Listing",
        subTitle: "Listing Booked",
        message: `Your listing has been successfully booked by ${buyerName}!`,
        icon: "listing-created",
        advertisement: {
          title: data.title,
          address: data.address,
          description: data.description,
          image: imageName[0],
          price: data.price,
        },
      };
      const emailContent = renderEmail(emailData);
      sendEmail(email, "Listing Booked", emailContent);
    }
    //send email to the buyer
    const emailData = {
      title: "ADEX Booking",
      subTitle: "Booking Accepted",
      message: `Congratulations, ${sellerName} has accepted your booking request and you are successfully booked!`,
      icon: "booking-request",
      advertisement: {
        title: data.title,
        address: data.address,
        description: data.description,
        image: imageName[0],
        price: data.price,
      },
    };
    const emailContent = renderEmail(emailData);
    sendEmail(buyerEmail, "Booking Request Accepted", emailContent);
    ///////////////////////////////////////////////////////////////////////////
    res.status(200).json({ message: "subscription created successfuly" });
  }
});

const RequestReserve = asyncHandler(async (req, res) => {
  const { data, start_date, end_date, duration, companyId } = req.body;

  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  const currentDate = new Date();
  const createdAtFormatted = getFormattedDate(currentDate);

  const startDate = new Date(start_date);
  const startDateFormatted = getFormattedDate(startDate);

  let endDate = new Date(start_date);

  if (data.ad_duration_type == "0") {
    endDate.setMonth(startDate.getMonth() + duration);
  } else if (data.ad_duration_type == "2") {
    endDate = start_date;
  } else {
    endDate = end_date;
  }

  endDate = new Date(endDate);
  const endDateFormatted = getFormattedDate(endDate);

  if (token) {
    try {
      const queryUpDateAdStatus = `
        UPDATE advertisement
        SET 
        status = 4,
        start_date = '${startDateFormatted}',
        end_date = '${endDateFormatted}',
        ${
          data.ad_duration_type == "0"
            ? `duration = ${duration},`
            : data.ad_duration_type == "2"
            ? `units = ${duration},`
            : ""
        }
        requested_by = ${userId},
        requested_by_company = ${companyId ? companyId : null}
        WHERE id = ${data.id}
    `;
      const result = await updateAdvertismentById(queryUpDateAdStatus);
      insertUserNotifications(
        data.seller_id,
        "Booking Request",
        "You have a booking request",
        createdAtFormatted,
        `listing/view/${data.id}`
      );

      const createdByUser = await getUsersById(data.seller_id);
      const sellerName = createdByUser[0].name;

      const requestedByUser = await getUsersById(userId);
      const buyerName = requestedByUser[0].name;
      const buyerEmail = requestedByUser[0].email;
      const advertisement = await getAdvertisementById(data.id);
      const imageName = advertisement[0].image.split(";");
      //send email to the seller
      if (createdByUser.length > 0) {
        const email = createdByUser[0].email;

        const emailData = {
          title: "ADEX Booking",
          subTitle: "Booking Request",
          message: `${buyerName} has requested to book your listing!`,
          icon: "booking-request",
          advertisement: {
            title: data.title,
            address: data.address,
            description: data.description,
            image: imageName[0],
            price: data.price,
          },
        };
        const emailContent = renderEmail(emailData);
        sendEmail(email, "Booking Request", emailContent);
      }
      //send email to the buyer
      const emailData = {
        title: "ADEX Booking",
        subTitle: "Booking Request",
        message: `Your booking request was successfully sent to ${sellerName}.`,
        icon: "booking-request",
        advertisement: {
          title: data.title,
          address: data.address,
          description: data.description,
          image: imageName[0],
          price: data.price,
        },
      };
      const emailContent = renderEmail(emailData);
      sendEmail(buyerEmail, "Booking Request", emailContent);

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "RequestReserve",
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

const DeclineRequest = asyncHandler(async (req, res) => {
  const { id, requestedBy } = req.body;

  const currentDate = new Date();
  const createdAtFormatted = getFormattedDate(currentDate);
  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  if (token) {
    try {
      const queryUpDateAdStatus = `
        UPDATE advertisement
        SET 
        status = 1,
        start_date = ${null},
        end_date = ${null},
        duration = 0,
        requested_by = ${null},
        requested_by_company = ${null}
        WHERE id = ${id}
    `;
      const result = await updateAdvertismentById(queryUpDateAdStatus);
      insertUserNotifications(
        requestedBy,
        "Booking Request rejected",
        "Your booking request was rejected, see more details",
        createdAtFormatted,
        `/market-place/details?id=${id}`
      );

      const results = await getUsersById(requestedBy);
      if (results.length > 0) {
        const email = results[0].email;
        sendEmail(
          email,
          "Booking request Rejected",
          "Your booking request was rejected"
        );
      }
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "DeclineRequest",
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

const CancelBooking = asyncHandler(async (req, res) => {
  const { advertisementId, sellerId, buyerId, cancelMessage } = req.body;
  const token = req.cookies.jwt;
  const currentDate = new Date();

  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const sellerInfo = await getSeller(sellerId);
      const sellerStripeId = sellerInfo[0].stripe_account;

      const buyerInfo = await getBuyer(buyerId);
      const buyerStripeId = buyerInfo[0].customer_id;

      const createdByUser = await getUsersById(sellerId);
      const sellerName = createdByUser[0].name;

      const requestedByUser = await getUsersById(buyerId);
      const buyerName = requestedByUser[0].name;
      const buyerEmail = requestedByUser[0].email;

      const advertisementInfo = await getAdvertisementById(advertisementId);
      const data = advertisementInfo[0];
      const imageName = data.image.split(";");

      const contractInfo = await getContract(
        advertisementId,
        sellerStripeId,
        buyerStripeId
      );
      const contractStripeId = contractInfo[0].schedule_subscription_id;
      let cancellationAllowed = contractInfo[0].cancellation_allowed == "1";

      const advertisement = await getAdvertisementById(advertisementId);
      const advertisementDurationType = advertisement[0].ad_duration_type;

      if (advertisementDurationType == "0") {
        cancellationAllowed = true;
      }

      if (cancellationAllowed) {
        const subscriptionSchedule = await stripe.subscriptionSchedules.cancel(
          contractStripeId,
          { prorate: false }
        );

        if (subscriptionSchedule.id) {
          //change contract status ,mandar assim apra testar retorno
          updateContract(contractStripeId, "3", cancelMessage);

          const query = `
          UPDATE advertisement SET
            status = '1',
            duration = null,
            requested_by = null,
            requested_by_company = null,
            start_date = CASE WHEN ad_duration_type <> 1 THEN NULL ELSE start_date END,
            end_date = CASE WHEN ad_duration_type <> 1 THEN NULL ELSE end_date END
          WHERE id = '${advertisementId}' 
        `;
          updateAdvertismentById(query);

          //send email to the seller
          if (createdByUser.length > 0) {
            const email = createdByUser[0].email;

            const emailData = {
              title: "ADEX Booking",
              subTitle: "Booking Canceled",
              message:
                userId == sellerId
                  ? "Booking cancelled successfully!"
                  : `${buyerName} has cancelled this booking!
            ${cancelMessage ? `Message: ${cancelMessage}` : ""}
          `,
              icon: "cancel-booking",
              advertisement: {
                title: data.title,
                address: data.address,
                description: data.description,
                image: imageName[0],
                price: data.price,
              },
            };
            const emailContent = renderEmail(emailData);
            sendEmail(email, "Booking Cancelled", emailContent);
          }
          //send email to the buyer
          const emailData = {
            title: "ADEX Booking",
            subTitle: "Booking Cancelled",
            message:
              userId == buyerId
                ? "Booking cancelled successfully!"
                : `${buyerName} has cancelled this booking!
        ${cancelMessage ? `Message: ${cancelMessage}` : ""}

        `,
            icon: "cancel-booking",
            advertisement: {
              title: data.title,
              address: data.address,
              description: data.description,
              image: imageName[0],
              price: data.price,
            },
          };
          const emailContent = renderEmail(emailData);
          sendEmail(buyerEmail, "Booking Cancelled", emailContent);
        }

        res.status(200).json({
          data: "Contract canceled",
        });
        return;
      }
      res.status(401).json({
        error: "It is not possible to cancel this booking",
      });
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "CancelBooking",
      });

      let message = "";
      if (error.type === "StripeInvalidRequestError") {
        message = error.raw.message.includes(
          "currently in the `canceled` status"
        )
          ? "This booking was already canceled"
          : "Something went wrong,please try again";
      } else {
        message = "Something went wrong,please try again";
      }
      res.status(500).json({
        error: message,
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const subscriptionEndedWebhook = asyncHandler(async (req, res) => {
  const event = req.body;

  if (event.type === "subscription_schedule.updated") {
    const scheduleId = event.data.object.id;
    const subscriptionId = event.data.object.subscription;

    if (subscriptionId) {
      updateContractSubscriptionId(subscriptionId, scheduleId);
    }
  } else if (event.type === "invoice.paid") {
    const subscriptionId = event.data.object.subscription;
    const price = event.data.object.lines.data[0].price.id;

    const contract = await getContractBySub(subscriptionId);
    const advertisementId = contract[0].advertisement_id;
    const scheduleId = contract[0].schedule_subscription_id;
    const invoicesPaidAmount = contract[0].invoices_paid;
    let endDate = contract[0].end_date;

    const advertisement = await getAdvertisementById(advertisementId);
    const duration = advertisement[0].duration;
    const data = advertisement[0];
    const imageName = data.image.split(";");

    const sellerId = advertisement[0].created_by;
    const seller = await getUsersById(sellerId);
    const sellerName = seller[0].name;
    const email = seller[0].email;

    const buyerId = advertisement[0].requested_by;
    const buyer = await getUsersById(buyerId);
    const buyerName = buyer[0].name;
    const buyerEmail = buyer[0].email;

    const advertisementDurationType = advertisement[0].ad_duration_type;

    let timeStampEndDate = "";
    if (advertisementDurationType != 0) {
      //  sum 86400 sec to increment the end date one day
      timeStampEndDate = event.data.object.status_transitions.paid_at + 86400;
    } else {
      endDate = new Date(endDate);
      timeStampEndDate = Math.floor(endDate.getTime() / 1000);
    }

    let timeStampStartDate;
    if (invoicesPaidAmount == 0) {
      timeStampStartDate = event.data.object.lines.data[0].period.start;
    } else {
      timeStampStartDate = contract[0].phase_start_date;
    }
    if (duration == invoicesPaidAmount + 1) {
      if (advertisementDurationType != 0) {
        const subscriptionSchedule = await stripe.subscriptionSchedules.cancel(
          scheduleId,
          { prorate: false }
        );
      } else {
        const subscriptionSchedule = await stripe.subscriptionSchedules.update(
          scheduleId,
          {
            proration_behavior: "none",
            phases: [
              {
                items: [
                  {
                    price: price,
                  },
                ],
                start_date: timeStampStartDate,
                end_date: timeStampEndDate,
              },
            ],
          }
        );
      }
    } else if (invoicesPaidAmount == 0) {
      updatePhaseDateContract(scheduleId, timeStampStartDate);
    }
    //update the amount of invoices paid
    updateContractInvoidePaid(subscriptionId);

    let emailData;
    let emailContent;
    const amountPaid = event.data.object.amount_paid;
    //send email to the seller
    emailData = {
      title: "An ADEX Payment Has Been Made!",
      subTitle: "",
      message: `A Payment from ${buyerName} has been sent to your account.`,
      icon: "payment-made",
      advertisement: {
        title: data.title,
        address: data.address,
        description: data.description,
        image: imageName[0],
        price: data.price,
      },
    };
    emailContent = renderEmail(emailData);
    sendEmail(email, "Booking Payment", emailContent);

    //email to the buyer
    emailData = {
      title: "ADEX Payment Made!!",
      subTitle: "",
      message: `You have made a payment of $${amountPaid} to ${sellerName}`,
      icon: "payment-made",
      advertisement: {
        title: data.title,
        address: data.address,
        description: data.description,
        image: imageName[0],
        price: data.price,
      },
    };
    emailContent = renderEmail(emailData);
    sendEmail(buyerEmail, "Booking Payment", emailContent);
  } else if (event.type === "invoice.payment_failed") {
    const subscriptionId = event.data.object.subscription;
    const contract = await getContractBySub(subscriptionId);
    const contractStripeId = contract[0].schedule_subscription_id;
    const advertisementId = contract[0].advertisement_id;
    const advertisement = await getAdvertisementById(advertisementId);
    const data = advertisement[0];
    const imageName = data.image.split(";");

    const sellerId = advertisement[0].created_by;
    const seller = await getUsersById(sellerId);
    const sellerEmail = seller[0].email;

    const buyerId = advertisement[0].requested_by;
    const buyer = await getUsersById(buyerId);
    const buyerName = buyer[0].name;
    const buyerEmail = buyer[0].email;

    let emailData;
    let emailContent;
    if (event.data.object.attempt_count == 2) {
      const cancelMessage = "Payment failed";

      updateContract(contractStripeId, "3", cancelMessage);

      const query = `
      UPDATE advertisement SET
        status = '1',
        duration = null,
        requested_by = null,
        requested_by_company = null,
        start_date = CASE WHEN ad_duration_type <> 1 THEN NULL ELSE start_date END,
        end_date = CASE WHEN ad_duration_type <> 1 THEN NULL ELSE end_date END
      WHERE id = '${advertisementId}' 
    `;
      updateAdvertismentById(query);

      //send email to the seller
      emailData = {
        title: "Payment Failed!",
        subTitle: "",
        message: `A Payment from ${buyerName} has failed again.The booking has been canceled.`,
        icon: "payment-made",
        advertisement: {
          title: data.title,
          address: data.address,
          description: data.description,
          image: imageName[0],
          price: data.price,
        },
      };
      emailContent = renderEmail(emailData);
      sendEmail(sellerEmail, "Booking Payment", emailContent);

      //send email to the buyer
      emailData = {
        title: "Payment Failed!",
        subTitle: "",
        message: `Dear ${buyerName}, Your booking has been canceled due to payment failures.`,
        icon: "payment-made",
        advertisement: {
          title: data.title,
          address: data.address,
          description: data.description,
          image: imageName[0],
          price: data.price,
        },
      };
      emailContent = renderEmail(emailData);
      sendEmail(buyerEmail, "Booking Payment", emailContent);
    } else {
      //send email to the seller
      emailData = {
        title: "Payment Failed!",
        subTitle: "",
        message: `A Payment from ${buyerName} has failed.`,
        icon: "payment-made",
        advertisement: {
          title: data.title,
          address: data.address,
          description: data.description,
          image: imageName[0],
          price: data.price,
        },
      };
      emailContent = renderEmail(emailData);
      sendEmail(sellerEmail, "Booking Payment", emailContent);

      //send email to the buyer
      emailData = {
        title: "Payment Failed!",
        subTitle: "",
        message: `Your payment attempt has failed. Please update your payment information. We will automatically retry the payment within the next 24 hours.Please note that if the payment fails again, your booking will be canceled. Thank you for your understanding.`,
        icon: "payment-made",
        advertisement: {
          title: data.title,
          address: data.address,
          description: data.description,
          image: imageName[0],
          price: data.price,
        },
      };
      emailContent = renderEmail(emailData);
      sendEmail(buyerEmail, "Booking Payment", emailContent);
    }
  }
  res.status(200).json({
    message: "webhook event: " + event,
  });
});

const updateCancellationStatus = asyncHandler(async (req, res) => {
  const { advertisementId, sellerId, buyerId } = req.body;

  const seller = await getSeller(sellerId);
  const sellerStripeId = seller[0].stripe_account;

  const buyer = await getBuyer(buyerId);
  const buyerStripeId = buyer[0].customer_id;

  updateContractCancellationStatus(
    advertisementId,
    sellerStripeId,
    buyerStripeId
  );
  res.status(200).json({
    message: "Cancellation status updated",
  });
});

const getContractInfo = asyncHandler(async (req, res) => {
  const { advertisementId, sellerId, buyerId } = req.body;

  const seller = await getSeller(sellerId);
  if(seller.length == 0){
    return res.status(404).json({message: "seller not found"});
  }else{

    const sellerStripeId = seller[0].stripe_account;
  
    const buyer = await getBuyer(buyerId);
    const buyerStripeId = buyer[0].customer_id;
  
    const contract = await getContract(
      advertisementId,
      sellerStripeId,
      buyerStripeId
    );
    res.status(200).json(contract[0]);
  }
});
const getAccountBalance = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;

  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const sellerInfo = await getSeller(userId);
      if (sellerInfo.length > 0) {
        const sellerStripeId = sellerInfo[0].stripe_account;
        const balance = await stripe.balance.retrieve({
          stripeAccount: sellerStripeId,
        });

        res.status(200).json(balance);
      }

      const buyerInfo = await getBuyer(userId);
      if (buyerInfo.length > 0) {
        const buyerStripeId = buyerInfo[0].customer_id;
        const customer = await stripe.customers.retrieve(buyerStripeId);
        const invoice = await stripe.invoices.search({
          query: `customer : "${buyerStripeId}" `,
        });

        res.status(200).json(customer);
      }
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "getAccountBalance",
      });
      let message = "Something went wrong";

      res.status(500).json({
        error: message,
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const deleteBankAccount = asyncHandler(async (req, res) => {
  const { bankAccountId } = req.body;

  const token = req.cookies.jwt;

  const deletedAt = new Date();
  const formattedDeletedAt = getFormattedDate(deletedAt);
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const sellerInfo = await getSeller(userId);
      const connectAccountId = sellerInfo[0].stripe_account;

      const deleted = await stripe.accounts.deleteExternalAccount(
        connectAccountId,
        bankAccountId
      );
      deleteExternalBankAccount(userId, bankAccountId, formattedDeletedAt);
      res.status(200).json({ message: "Payout Method deleted successfully" });
    } catch (error) {
      logger.error(error.message, {
        userId: userId,
        endpoint: "deleteBankAccount",
      });
      let message = "";

      if (error.type == "StripeInvalidRequestError") {
        if (
          error.raw.message.includes(
            "You cannot delete the default external account"
          )
        ) {
          message =
            "You cannot delete the default external account, Please make another external account the default and try to delete this one again";
        } else {
          message = "Something went wrong,Please try again later ";
        }
      } else {
        message = "Something went wrong,Please try again later";
      }

      res.status(500).json({
        error: message,
      });
    }
  } else {
    res.status(401).json({
      error: "Not authorized, no token",
    });
  }
});

const deleteCard = asyncHandler(async (req, res) => {
  const { cardId } = req.body;

  const token = req.cookies.jwt;

  const deletedAt = new Date();
  const formattedDeletedAt = getFormattedDate(deletedAt);
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    try {
      const paymentMethod = await stripe.paymentMethods.detach(cardId);
      deleteCreditCard(userId, cardId, formattedDeletedAt);
      res.status(200).json({ message: "Card deleted successfully" });
    } catch (error) {
      logger.error(error.message, { userId: userId, endpoint: "deleteCard" });
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

export {
  // CreateSubscribing,
  CreateCustomer,
  GetCards,
  SetDefaultCard,
  CreateExternalBankAccount,
  GetBankAccounts,
  SetDefaultBank,
  CreatePaymentIntent,
  RequestReserve,
  DeclineRequest,
  CancelBooking,
  subscriptionEndedWebhook,
  updateCancellationStatus,
  getContractInfo,
  getAccountBalance,
  deleteBankAccount,
  deleteCard,
};
