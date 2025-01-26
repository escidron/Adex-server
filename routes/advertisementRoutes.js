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
deleteDiscount,
getPendingListings,
getListingReviews,
getSellerReviews,
getBuyerReviews,
receiveFiles,
removeFiles,
downloadFiles,
createCampaign,
getCampaignSubscribers,
createCampaignSubscription,
cancelCampaignSubscription,
checkBuyerSubscription
} from '../controllers/advertisementController.js';

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
router.get('/get-pending-bookings', getPendingListings);
router.post('/get-listing-reviews', getListingReviews);
router.post('/get-seller-reviews', getSellerReviews);
router.post('/get-buyer-reviews', getBuyerReviews);
router.post('/send-files', receiveFiles);
router.post('/remove-files', removeFiles);
router.post('/download-files', downloadFiles);
router.post('/new-campaign', createCampaign);
router.get('/get-campaign-subscribers/:campaignId', getCampaignSubscribers);
router.post('/create-campaign-subscription', createCampaignSubscription);
router.post('/cancel-campaign-subscription', cancelCampaignSubscription);
router.get('/check-buyer-subscription/:campaignId', checkBuyerSubscription);


export default router;