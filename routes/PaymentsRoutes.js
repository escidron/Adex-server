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
    subscriptionEndedWebhook,
    updateCancellationStatus,
    getContractInfo,
    getAccountBalance,
    deleteBankAccount,
    deleteCard
} from '../controllers/PaymentsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { getContract } from '../queries/Payments.js';

const router = express.Router();
// router.post('/', CreateSubscribing);
router.post('/customer', CreateCustomer);

router.post('/my-cards', GetCards);
router.post('/set-default-card', SetDefaultCard);
router.post('/delete-card', deleteCard);

router.post('/external-bank', CreateExternalBankAccount);
router.post('/my-bank-accounts', GetBankAccounts);
router.post('/set-default-bank', SetDefaultBank);
router.post('/delete-bank-account', deleteBankAccount);

router.post('/create-payment-intent', CreatePaymentIntent);
router.post('/request-reserve', RequestReserve);
router.post('/decline-request', DeclineRequest);
router.post('/cancel-booking', CancelBooking);
router.post('/subscription-webhook', subscriptionEndedWebhook);
router.post('/update-cancellation-status', updateCancellationStatus);
router.post('/get-contract', getContractInfo);
router.post('/get-account-balance', getAccountBalance);

export default router;