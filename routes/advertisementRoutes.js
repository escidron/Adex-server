import express from 'express';
import {
getAdvertisement,
createAdvertisement,
updateAdvertisement,
getMyAdvertisement,
GetAdvertisementDetails,
getMyBookings
} from '../controllers/advertisementController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post('/', getAdvertisement);
router.post('/my-advertisement', getMyAdvertisement);
router.post('/my-booking', getMyBookings);
router.post('/new', createAdvertisement);
router.post('/update', updateAdvertisement);
router.post('/details', GetAdvertisementDetails);

export default router;