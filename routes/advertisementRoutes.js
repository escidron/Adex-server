import express from 'express';
import {
getAdvertisement,
createAdvertisement,
updateAdvertisement,
getMyAdvertisement,
GetAdvertisementDetails,
getMyBookings,
getMessages,
getChatInfo,
DeleteAdvertisment,
getDiscounts,
getSharedListing,
getSellerListings,
createDraft,
getDraft,
deleteDiscount
} from '../controllers/advertisementController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post('/', getAdvertisement);
router.post('/my-advertisement', getMyAdvertisement);
router.post('/my-booking', getMyBookings);
router.post('/new', createAdvertisement);
router.post('/draft', createDraft);
router.post('/update', updateAdvertisement);
router.post('/delete-advertisement', DeleteAdvertisment);
router.post('/details', GetAdvertisementDetails);
router.post('/messages', getMessages);
router.post('/chat-info', getChatInfo);
router.post('/discounts', getDiscounts);
router.post('/delete-discount', deleteDiscount);
router.post('/shared-listing', getSharedListing);
router.post('/seller-listings', getSellerListings);
router.get('/get-draft', getDraft);

export default router;