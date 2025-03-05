import express from "express";
import { createOrder, capturePayment, createPayout, getPayoutStatus } from "../controllers/paymentGatewayController.js";

const router = express.Router();
// router.post('/', CreateSubscribing);
router.post("/paypal/create-order", createOrder);
router.post("/paypal/capture-payment/:orderId", capturePayment);
router.post("/paypal/create-payout", createPayout);
router.get("/paypal/payout-status/:payoutId", getPayoutStatus);
export default router;