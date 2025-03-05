import { getUserPaymentByAdvertisementId, getUserPaymentByPaymentId, insertUserPayment, updateUserPaymentPaidToAdexer, updateUserPaymentPaidToUser } from "../queries/Payments.js";
import getFormattedDate from "../utils/getFormattedDate.js";
import {
  paypalCreateOrder,
  paypalCapturePayment,
  paypalPayoutToReceiver,
  paypalPayoutStatus,
} from "../utils/paymentGateway/paypalService.js";

// paypal create order
const createOrder = async (req, res) => {
  const {
    amount,
    currency,
    advertisement_id,
    receiver_user_id,
    paypal_receiver_email,
  } = req.body;
  const user_id = req.user;

  if (!advertisement_id || !receiver_user_id || !paypal_receiver_email) {
    return res.status(400).json({
      success: false,
      message: "Advertisement ID, receiver user ID, and PayPal receiver email are required",
    });
  }
  // @TODO: get advertisement details
  const { jsonResponse, httpStatusCode } = await paypalCreateOrder(
    amount,
    currency
  );

//   const userPayment = await getUserPaymentByAdvertisementId(advertisement_id);
//   if (!userPayment.length) {
    const formattedPaymentDate = getFormattedDate(new Date());
    await insertUserPayment(
      user_id,
      receiver_user_id,
      advertisement_id,
      `'${paypal_receiver_email}'`,
      "'PAYPAL'",
      `'${jsonResponse.id}'`,
      null,
      "'ADEXER'",
      "'CREATED'",
      `'${currency}'`,
      amount,
      `'${formattedPaymentDate}'`,
      null
    );
//   }
  return res.status(httpStatusCode).json(jsonResponse);
};

const capturePayment = async (req, res) => {
  const { orderId } = req.params;
  
  // First get the payment details
  const userPayment = await getUserPaymentByPaymentId(orderId);
  if (!userPayment) {
    return res.status(400).json({
      success: false,
      message: "User payment not found",
    });
  }

  // Capture the payment with PayPal
  const response = await paypalCapturePayment(orderId);

  // Update the payment status in our database
  try {
    await updateUserPaymentPaidToAdexer(orderId);
    return res.status(200).json({ response });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message
    });
  }
};

const createPayout = async (req, res) => {
  try {
    const {
      recipientEmail,
      amount,
      currency = "USD",
      note = "Payment for your services",
      orderId
    } = req.body;

    if (!recipientEmail || !amount) {
      return res.status(400).json({
        success: false,
        message: "Recipient email and amount are required",
      });
    }

    const userPayment = await getUserPaymentByPaymentId(orderId);
    if (!userPayment) {
      return res.status(400).json({
        success: false,
        message: "User payment not found",
      });
    }

    const response = await paypalPayoutToReceiver(
      amount,
      recipientEmail,
      currency,
      note
    );

    const { batch_header } = response.jsonResponse;

    await updateUserPaymentPaidToUser(orderId, batch_header.payout_batch_id);
    // This is a placeholder response
    return res.status(response.httpStatusCode).json({
      success: true,
      data: response.jsonResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process payout",
      error: error.message,
    });
  }
};

const getPayoutStatus = async (req, res) => {
  const { payoutId } = req.params;

  const response = await paypalPayoutStatus(payoutId);
  return res.status(response.httpStatusCode).json({
    response: response.jsonResponse,
  });
};

export { createOrder, capturePayment, createPayout, getPayoutStatus };

//5,532.75
