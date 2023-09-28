import express from 'express';
import {
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
} from '../controllers/PaymentsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
// router.post('/', CreateSubscribing);
router.post('/customer', CreateCustomer);
router.post('/my-cards', GetCards);
router.post('/my-bank-accounts', GetBankAccounts);
router.post('/set-default-card', SetDefaultCard);
router.post('/set-default-bank', SetDefaultBank);
router.post('/external-bank', CreateExternalBankAccount);
router.post('/create-payment-intent', CreatePaymentIntent);
router.post('/request-reserve', RequestReserve);
router.post('/decline-request', DeclineRequest);
router.post('/cancel-booking', CancelBooking);
router.post('/subscription-webhook', subscriptionEndedWebhook);

export default router;