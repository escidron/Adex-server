import express from 'express';
import {
  authUser,
  registerUser,
  logoutUser,
  getSellerProfile,
  updateUserAddress,
  autoLogin,
  getExternalAccount,
  getUserProfile,
  updateUserProfileImage,
  updateUserProfile
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', registerUser);
router.post('/auth', authUser);
router.post('/logout', logoutUser);
router.post('/my-profile-image', updateUserProfileImage);
router.post('/update-address',updateUserAddress);
router.post('/update-user-profile',updateUserProfile);
router.get('/autologin', autoLogin);
router.get('/external-account', getExternalAccount);
router.get('/user-profile', getUserProfile);
router
  .route('/seller-profile')
  .get(protect, getSellerProfile)
//   .put(protect, updateUserAddress);
export default router;