import dotenv from "dotenv";
dotenv.config();


const cacheDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
let cachedPaypalAccessToken = null;
let lastCacheTime = null;

// Helper function to get access token
const getAccessToken = async () => {
  try {

    const currentTime = Date.now();
    if (cachedPaypalAccessToken && currentTime - lastCacheTime > cacheDuration) {
      return cachedPaypalAccessToken;
    }

    const response = await fetch(`${process.env.PAYPAL_API_ENDPOINT}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Failed to get access token');
    // assign the access token into cache
    cachedPaypalAccessToken = data.access_token;
    lastCacheTime = currentTime;
    return data.access_token;
  } catch (error) {
    console.error("Error getting PayPal access token:", error);
    throw error;
  }
};

const paypalCreateOrder = async (amount, currency = "USD", description = "") => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${process.env.PAYPAL_API_ENDPOINT}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
            description: description,
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create order');
    
    return {
      jsonResponse: data,
      httpStatusCode: response.status,
    };
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    throw error;
  }
};

const paypalCapturePayment = async (orderId) => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${process.env.PAYPAL_API_ENDPOINT}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to capture payment');

    return {
      jsonResponse: data,
      httpStatusCode: response.status,
    };
  } catch (error) {
    console.error("Error capturing PayPal payment:", error);
    throw error;
  }
};

const paypalGetOrderDetails = async (orderId) => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${process.env.PAYPAL_API_ENDPOINT}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to get order details');

    return {
      jsonResponse: data,
      httpStatusCode: response.status,
    };
  } catch (error) {
    console.error("Error getting PayPal order details:", error);
    throw error;
  }
};

const paypalRefundPayment = async (captureId, amount, currency = "USD", note = "") => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${process.env.PAYPAL_API_ENDPOINT}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: {
          currency_code: currency,
          value: amount.toString(),
        },
        note_to_payer: note,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to refund payment');

    return {
      jsonResponse: data,
      httpStatusCode: response.status,
    };
  } catch (error) {
    console.error("Error refunding PayPal payment:", error);
    throw error;
  }
};

const paypalPayout = async (amount, currency = "USD", note = "") => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${process.env.PAYPAL_API_ENDPOINT}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `Payout_${Date.now()}`,
          email_subject: "You have a payout!",
          email_message: note || "You received a payout! Thanks for using our service!",
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: {
              currency: currency,
              value: amount.toString(),
            },
            note: note,
            sender_item_id: `Payout_Item_${Date.now()}`,
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create payout');

    return {
      jsonResponse: data,
      httpStatusCode: response.status,
    };
  } catch (error) {
    console.error("Error creating PayPal payout:", error);
    throw error;
  }
};

const paypalPayoutToReceiver = async (
  amount, 
  receiverEmail, 
  currency = "USD", 
  note = "",
  emailSubject = "You have a payout!",
  emailMessage = "You received a payout! Thanks for using our service!"
) => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${process.env.PAYPAL_API_ENDPOINT}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `Payout_${Date.now()}`,
          email_subject: emailSubject,
          email_message: emailMessage,
        },
        items: [
          {
            recipient_type: "EMAIL",
            receiver: receiverEmail,
            amount: {
              currency: currency,
              value: amount.toString(),
            },
            note: note,
            sender_item_id: `Payout_Item_${Date.now()}`,
            notification_language: "en-US"
          },
        ],
      }),
    });

    const data = await response.json();    
    if (!response.ok) throw new Error(data.message || 'Failed to create payout to receiver');

    return {
      jsonResponse: data,
      httpStatusCode: response.status,
    };
  } catch (error) {
    console.error("Error creating PayPal payout to receiver:", error.message);
    throw error;
  }
};

const paypalPayoutStatus = async (payoutId) => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${process.env.PAYPAL_API_ENDPOINT}/v1/payments/payouts/${payoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`, 
      },
    });

    const data = await response.json();
    
    return {
      jsonResponse: data,
      httpStatusCode: response.status,
    };
  } catch (error) {
    console.error("Error getting PayPal payout status:", error);
    throw error;
  }
};

export {
  paypalCreateOrder,
  paypalCapturePayment,
  paypalGetOrderDetails,
  paypalRefundPayment,
  paypalPayout,
  paypalPayoutToReceiver,
  paypalPayoutStatus,
};
