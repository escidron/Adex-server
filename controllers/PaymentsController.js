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
  getContractById
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
import { updateAdvertismentById } from "../queries/Advertisements.js";
import dotenv from "dotenv";
import { listingBookedTamplate } from "../utils/emailTamplates/listingBooked.js";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CreateCustomer = asyncHandler(async (req, res) => {
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
  insertCard(
    userId,
    cardId,
    brand,
    nameOnCard,
    cardNumber,
    exp_year,
    exp_month,
    formattedCreatedAt
  );

  const queryUpDateDefaultCard = `
    UPDATE cards
    SET is_default = 0
    WHERE user_id = ${userId}
    AND stripe_payment_method_id <> '${cardId}'
`;
  updateCard(queryUpDateDefaultCard);

  const results = await getBuyer(userId);

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

    updateBuyer(userId, cardId);
  } else {
    const customer = await stripe.customers.create({
      description: fullName,
      email: email,
      // test_clock: "clock_1NtesLL3Lxo3VPLoxWRMkoSA",
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

    insertBuyer(userId, customer, fullName, email, cardId, formattedCreatedAt);
  }

  res.status(200).json({
    message: "Payment method saved successfully.",
  });
});

const CreateExternalBankAccount = asyncHandler(async (req, res) => {
  //get userID
  const { routingNumber, accountNumber, stripeAccount, bankAccountName } =
    req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const createdAt = new Date();
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

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
    insertAccount(
      userId,
      routingNumber,
      accountNumber,
      bankAccount,
      bankAccountName,
      formattedCreatedAt
    );
    updateAccount(userId, bankAccount, formattedCreatedAt);
    updateSeller(userId, bankAccount, formattedCreatedAt);

    const query = `
      UPDATE advertisement SET
        status = '1',
        updated_at = '${formattedCreatedAt}'
      WHERE created_by = ${userId} and status = '0'
    `;
    updateAdvertismentById(query);

    res.status(200).json({ message: "Bank account created" });
  } catch (error) {
    console.log("error", error.message);
    res.status(400).json({ error: error.message });
  }

  //save card
});

const GetCards = asyncHandler(async (req, res) => {
  //get user id
  const token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const result = await getCard(userId);
      res.status(200).json({
        data: result,
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

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const result = await getExternalAccount(userId);
      res.status(200).json({
        data: result,
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

  const upuatedAt = new Date();
  const formattedUpdatedAt = upuatedAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  // get the seller account
  const results = await getSeller(userId);

  const account = results[0].stripe_account;
  // res.status(200).json({ message: "default bank changed" });

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
  const { data, start_date, duration, current_discount } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const createdAt = new Date();
  const formattedUpdatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  let startDate = new Date(start_date.substring(0, 10));
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

  let sellerAccount = "";
  //get the seller connected stripe account
  const result = await getSeller(data.created_by);
  sellerAccount = result[0].stripe_account;

  //get the buyer info
  const results = await getBuyer(
    data.requested_by ? data.requested_by : userId
  );

  const customerId = results[0].customer_id;

  let subscription = "";
  try {
    if (data.ad_duration_type === "0") {
      startDate = new Date();
      endDate = new Date();

      endDate.setMonth(endDate.getMonth() + 1);
    }
    var timeStampStartDate = Math.floor(startDate.getTime() / 1000);
    var timeStampEndDate = Math.floor(endDate.getTime() / 1000);

    let coupon = "";

    if (current_discount > 0) {
      coupon = await stripe.coupons.create({
        percent_off: current_discount,
        duration: "forever",
      });
    }

    subscription = await stripe.subscriptionSchedules.create({
      customer: customerId,
      start_date: timeStampStartDate,
      end_behavior: "cancel",
      metadata:{
        userId
      },
      phases: [
        {
          items: [
            {
              price: data.stripe_price,
              quantity: 1,
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
        duration = '${duration}'
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
        ? `/my-booking?id=${data.id}`
        : `/my-listing?id=${data.id}`
    );

    const results = await getUsersById(
      data.created_by == userId ? data.requested_by : data.created_by
    );

    if (results.length > 0) {
      const email = results[0].email;
      sendEmail(
        email,
        data.created_by == userId
          ? "Booking Request accepted"
          : "Listing booked",
        data.created_by == userId
          ? "Your Booking request was accepted, see more details"
          : "One of your listing was booked, see more details"
      );
    }
    res.status(200).json({ message: "subscription created successfuly" });
  }
});

const RequestReserve = asyncHandler(async (req, res) => {
  const { data, start_date, duration } = req.body;

  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const startDate = new Date(start_date.substring(0, 10));
  const startDateFormatted = startDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const currentDate = new Date();
  const createdAtFormatted = currentDate
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
      const result = await updateAdvertismentById(queryUpDateAdStatus);
      insertUserNotifications(
        data.created_by,
        "Booking Request",
        "You have a booking request",
        createdAtFormatted,
        `/my-listing?id=${data.id}`
      );

      const results = await getUsersById(data.created_by);

      if (results.length > 0) {
        const email = results[0].email;
        sendEmail(email, "Booking request", "You have a booking request");
      }

      res.status(200).json({
        data: result,
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

const DeclineRequest = asyncHandler(async (req, res) => {
  const { id, requestedBy } = req.body;

  const currentDate = new Date();
  const createdAtFormatted = currentDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
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
        requested_by = ''
        WHERE id = ${id}
    `;
      const result = await updateAdvertismentById(queryUpDateAdStatus);
      insertUserNotifications(
        requestedBy,
        "Booking Request rejected",
        "Your booking request was rejected, see more details",
        createdAtFormatted,
        `/my-listing?id=${id}`
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

const CancelBooking = asyncHandler(async (req, res) => {
  const { advertisementId, sellerId, buyerId, cancelMessage } = req.body;
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentDate = new Date();
  const createdAtFormatted = currentDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  if (token) {
    try {
      const userId = decoded.userId;

      const sellerInfo = await getSeller(sellerId);
      const sellerStripeId = sellerInfo[0].stripe_account;

      const buyerInfo = await getBuyer(buyerId);
      const buyerStripeId = buyerInfo[0].customer_id;

      const cancelNotificationUser = await getUsersById(
        userId == sellerId ? buyerId : sellerId
      );
      const cancelNotificationEmail = cancelNotificationUser[0].email;

      sendEmail(
        cancelNotificationEmail,
        "Booking Canceled",
        "This booking has been cancelled",
        listingBookedTamplate
      );

      const contractInfo = await getContract(
        advertisementId,
        sellerStripeId,
        buyerStripeId
      );
      const contractStripeId = contractInfo[0].subscription_id;

      const subscriptionSchedule = await stripe.subscriptionSchedules.cancel(
        contractStripeId,
        { prorate: false }
      );

      // const subscriptionSchedule = await stripe.subscriptionSchedules.retrieve(
      //   contractStripeId
      // );

      //Process for getting the payment intent id and refund the payment
      const subscription = await stripe.subscriptions.retrieve(
        subscriptionSchedule.subscription
      );
      const invoice = await stripe.invoices.retrieve(
        subscription.latest_invoice
      );
      const paymentIntentId = invoice.payment_intent;
      const chargeId = invoice.charge;

      const charge = await stripe.charges.retrieve(chargeId);

      const aplicationFeesID = charge.application_fee;
      const connectedAccountId = charge.destination;
      const totalValue = charge.amount;
      const feeValue = charge.application_fee_amount;

      const applicationFee = await stripe.applicationFees.retrieve(
        aplicationFeesID
      );

      const connectChargeId = applicationFee.charge;
      //fazer o calculo para refund sem fees
      const refundConnectAccount = await stripe.refunds.create(
        { charge: connectChargeId, amount: totalValue - feeValue },
        { stripeAccount: connectedAccountId }
      );

      const refundCustomer = await stripe.refunds.create({
        payment_intent: paymentIntentId,
      });
      ///

      if (subscriptionSchedule.id) {
        //change contract status ,mandar assim apra testar retorno
        updateContract(contractStripeId, "3", cancelMessage);

        const query = `
        UPDATE advertisement SET
          status = '1'
        WHERE id = '${advertisementId}' 
      `;
        updateAdvertismentById(query);
      }

      res.status(200).json({
        data: "Contract canceled",
      });
    } catch (error) {
      console.error(error);
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
      res.status(401).json({
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
  console.log('entrouuuuu')

  if(event.type === 'subscription_schedule.canceled'){
    
    const updatedAt = new Date();
    const formattedUpdateddAt = updatedAt
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    console.log('eventttt',event.data.object.phases)
    const contractId = event.data.object.id
    updateContract(contractId,'3','Contract is ended')
    
    const result = await getContractById(contractId)
    const advertisementId = result[0].advertisement_id
    const query = `
    UPDATE advertisement SET
      status = '1',
      updated_at = '${formattedUpdateddAt}'
    WHERE id = ${advertisementId} 
  `;
  updateAdvertismentById(query);
  }
  res.status(401).json({
    error: "Not authorized, token failed",
  });
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
  subscriptionEndedWebhook
};
