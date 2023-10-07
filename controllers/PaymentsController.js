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
  getContractById,
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
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CreateCustomer = asyncHandler(async (req, res) => {
  //get userID
  const { cardId, nameOnCard } = req.body;

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

  const buyer = await getBuyer(userId)
  const customertId = buyer[0].customer_id
  
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customertId,
    type: 'card',
  });
  const isDefault = paymentMethods.data.length == 0

  insertCard(
    userId,
    cardId,
    nameOnCard,
    formattedCreatedAt,
    isDefault
  );



//   const queryUpDateDefaultCard = `
//     UPDATE cards
//     SET is_default = ${stripeCards.length > 0 ? '0' : '1'}
//     WHERE user_id = ${userId}
//     AND stripe_payment_method_id <> '${cardId}'
// `;
//   updateCard(queryUpDateDefaultCard);

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
      test_clock: "clock_1NxKLdL3Lxo3VPLot4nh5oky",
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

    const seller = await getSeller(userId)
    const accountId = seller[0].stripe_account
    
    const bankAccounts = await stripe.accounts.listExternalAccounts(
      accountId,
      {object: 'bank_account'}
    );
    const isDefault = bankAccounts.data.length == 0
    insertAccount(
      userId,
      bankAccount,
      formattedCreatedAt,
      isDefault
    );
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
      const storagedCards = await getCard(userId);
      
      const buyer = await getBuyer(userId)
      const customertId = buyer[0].customer_id
      
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customertId,
        type: 'card',
      });
      const stripeCards = paymentMethods.data
      const cards = stripeCards.map((card) => {
        // Procurando o elemento correspondente em array2 com o mesmo ID
        const storagedCard = storagedCards.find((item) => item.stripe_payment_method_id === card.id);
      
        // Se encontrarmos um elemento correspondente em array2, adicionamos o parâmetro "age"
        if (storagedCard) {
          return {
            ...card, // Mantém as propriedades originais de card
            is_default: storagedCard.is_default,
            name_on_card: storagedCard.name// Adiciona o parâmetro "age" de storagedCard
          };
        }
      
        // Se não encontrarmos um elemento correspondente em array2, retornamos card sem alterações
        return card;
      });
      res.status(200).json({
        data: cards,
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
      const seller = await getSeller(userId)
      const accountId = seller[0].stripe_account
      
      const bankAccounts = await stripe.accounts.listExternalAccounts(
        accountId,
        {object: 'bank_account'}
      );

      res.status(200).json(bankAccounts);
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
  } else if (data.ad_duration_type == "0") {
    endDate.setMonth(startDate.getMonth() + 1);
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
    if (data.ad_duration_type != "0") {
      startDate.setDate(startDate.getDate() + 6);
      endDate.setDate(endDate.getDate() + 6);
    }
    let timeStampFirstBill = Math.floor(startDate.getTime() / 1000);
    let timeStampEndDate = Math.floor(endDate.getTime() / 1000);

    let coupon = "";

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

    ////////////////////////////////////////////////////////////////////////
    const createdByUser = await getUsersById(data.created_by);
    const sellerName = createdByUser[0].name;

    const requestedByUser = await getUsersById(data.requested_by);
    const buyerName = requestedByUser[0].name;
    const buyerEmail = requestedByUser[0].email;
    //send email to the seller
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
  const { data, start_date, duration } = req.body;

  //get user id
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;

  let startDate = "";
  if (data.category_id == 17) {
    startDate = new Date();
  } else {
    startDate = new Date(start_date.substring(0, 10));
  }

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

      const createdByUser = await getUsersById(data.created_by);
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
          message: `${buyerName} has requested to book your listing`,
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
  // const createdAtFormatted = currentDate
  //   .toISOString()
  //   .slice(0, 19)
  //   .replace("T", " ");

  if (token) {
    try {
      const userId = decoded.userId;

      const sellerInfo = await getSeller(sellerId);
      const sellerStripeId = sellerInfo[0].stripe_account;

      const buyerInfo = await getBuyer(buyerId);
      const buyerStripeId = buyerInfo[0].customer_id;


      ////////////////////////////////////////////////////////////////////////
      const createdByUser = await getUsersById(sellerId);
      const sellerName = createdByUser[0].name;

      const requestedByUser = await getUsersById(buyerId);
      const buyerName = requestedByUser[0].name;
      const buyerEmail = requestedByUser[0].email;

      const advertisementInfo = await getAdvertisementById(advertisementId);
      const data = advertisementInfo[0];
      const imageName = data.image.split(";");

      //send email to the seller
      if (createdByUser.length > 0) {
        const email = createdByUser[0].email;

        const emailData = {
          title: "ADEX Booking",
          subTitle: "Booking Canceled",
          message: `${buyerName} has cancelled this booking!`,
          icon: "sem-image",
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
        message: `Booking cancelled successfully!`,
        icon: "sem-image",
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
      //////////////////////////////////////////////////////////////////////
      const contractInfo = await getContract(
        advertisementId,
        sellerStripeId,
        buyerStripeId
      );
      const contractStripeId = contractInfo[0].schedule_subscription_id;
      let cancellationAllowed = contractInfo[0].cancellation_allowed == "1";

      const advertisement = await getAdvertisementById(advertisementId);
      const advertisementDurationType = advertisement[0].ad_duration_type;

      let cancellationRange = true;
      if (advertisementDurationType == "0") {
        const startFormattedDate = contractInfo[0].start_date;
        cancellationRange = startFormattedDate > currentDate;
      }

      if (cancellationAllowed && cancellationRange) {
        const subscriptionSchedule = await stripe.subscriptionSchedules.cancel(
          contractStripeId,
          { prorate: false }
        );

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
      }
      res.status(401).json({
        error: "It is not possible to cancel this booking",
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

  if (event.type === "subscription_schedule.canceled") {
    const updatedAt = new Date();
    const formattedUpdateddAt = updatedAt
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const contractId = event.data.object.id;
    updateContract(contractId, "3", "Contract is ended");

    const result = await getContractById(contractId);
    const advertisementId = result[0].advertisement_id;
    const advertisement = await getAdvertisementById(advertisementId);
    const data = advertisement[0];
    const imageName = data.image.split(";");

    const query = `
    UPDATE advertisement SET
      status = '1',
      updated_at = '${formattedUpdateddAt}'
    WHERE id = ${advertisementId} 
  `;
    updateAdvertismentById(query);

    if (updatedAt == data.end_date) {
      let emailData;
      let emailContent;

      const sellerId = data[0].created_by;
      const seller = await getUsersById(sellerId);
      const email = seller[0].email;

      const buyerId = data[0].requested_by;
      const buyer = await getUsersById(buyerId);
      const buyerEmail = buyer[0].email;
      //send email to the seller
      emailData = {
        title: "ADEX Booking",
        subTitle: "Booking Expired",
        message: `Your booking has expired!`,
        icon: "booking-expired",
        advertisement: {
          title: data.title,
          address: data.address,
          description: data.description,
          image: imageName[0],
          price: data.price,
        },
      };
      emailContent = renderEmail(emailData);
      sendEmail(email, "Booking Expired", emailContent);

      //email to the buyer
      emailData = {
        title: "ADEX Booking",
        subTitle: "Booking Expired",
        message: `Your booking has expired!`,
        icon: "booking-expired",
        advertisement: {
          title: data.title,
          address: data.address,
          description: data.description,
          image: imageName[0],
          price: data.price,
        },
      };
      emailContent = renderEmail(emailData);
      sendEmail(buyerEmail, "Booking Expired", emailContent);
    }
  } else if (event.type === "subscription_schedule.updated") {
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
    if (advertisementDurationType == 0) {
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
      if (advertisementDurationType == 0) {
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
      icon: "sem-image",
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
  }
  res.status(401).json({
    error: "Not authorized, token failed",
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
  const sellerStripeId = seller[0].stripe_account;

  const buyer = await getBuyer(buyerId);
  const buyerStripeId = buyer[0].customer_id;

  const contract = await getContract(
    advertisementId,
    sellerStripeId,
    buyerStripeId
  );
  res.status(200).json(contract[0]);
});

const getAccountBalance = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (token) {
    try {
      const userId = decoded.userId;

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
      console.error(error);
      let message = "Something went wrong";

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

const deleteBankAccount = asyncHandler(async (req, res) => {
  const { bankAccountId } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const deletedAt = new Date();
  const formattedDeletedAt = deletedAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  if (token) {
    try {
      const userId = decoded.userId;

      const sellerInfo = await getSeller(userId);
      const connectAccountId = sellerInfo[0].stripe_account

      const deleted = await stripe.accounts.deleteExternalAccount(
        connectAccountId,
        bankAccountId
      );
        deleteExternalBankAccount(userId,bankAccountId,formattedDeletedAt)
        res.status(200).json({message : 'Payout Method deleted successfully'})
    } catch (error) {
      console.error(error);
      let message = "";

      if(error.type =='StripeInvalidRequestError'){
        if(error.raw.message.includes('You cannot delete the default external account')){
          message = "You cannot delete the default external account, Please make another external account the default and try to delete this one again";
        }else{
          message = "Something went wrong,Please try again later ";
        }
      }else{

        message = "Something went wrong,Please try again later";
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

const deleteCard = asyncHandler(async (req, res) => {
  const { cardId } = req.body;

  const token = req.cookies.jwt;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const deletedAt = new Date();
  const formattedDeletedAt = deletedAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  if (token) {
    try {
      const userId = decoded.userId;
      const paymentMethod = await stripe.paymentMethods.detach(
        cardId
      );
      deleteCreditCard(userId,cardId,formattedDeletedAt)
      res.status(200).json({message : 'Card deleted successfully'})
    } catch (error) {
      console.error(error);

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
  deleteCard
};
