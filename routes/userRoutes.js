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
  updateUserProfile,
  getMyNotifications,
  resetPassword,
  sendResetPasswordEmail,
  changePassword,
  contactUs,
  addCompany,
  getCompanies,
  getCompany,
  companyGallery,
  getCompanyGallery,
  clearUserNotifications
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', registerUser);
router.post('/auth', authUser);
router.post('/logout', logoutUser);
router.post('/my-profile-image', updateUserProfileImage);
router.post('/update-address',updateUserAddress);
router.post('/update-user-profile',updateUserProfile);
router.post('/notifications',getMyNotifications);
router.get('/autologin', autoLogin);
router.get('/external-account', getExternalAccount);
router.get('/user-profile', getUserProfile);
router.post('/user-profile', getUserProfile);
router.post('/reset-password', resetPassword);
router.post('/change-password', changePassword);
router.post('/send-reset-password-email', sendResetPasswordEmail);
router.post('/contact-us', contactUs);
router.post('/add-company', addCompany);
router.get('/get-companies', getCompanies);
router.post('/my-company', getCompany);
router.post('/company-gallery', companyGallery);
router.post('/get-company-gallery', getCompanyGallery);
router.post('/clear-notifications', clearUserNotifications);

router
  .route('/seller-profile')
  .get(protect, getSellerProfile)
//   .put(protect, updateUserAddress);
export default router;