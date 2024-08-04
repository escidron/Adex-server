import express from 'express';
import {
  authUser,
  registerUser,
  verifyEmail,
  logoutUser,
  getSellerProfile,
  createUserConnectAccount,
  createCompanyConnectAccount,
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
  imageGallery,
  getImageGallery,
  clearUserNotifications,
  testRoute,
  sendMessage,
  removeGalleryImage,
  removeCompany,
  rateBuyer,
  rateSeller,
  editCompany,
  addSocialMediaInfo,
  getSocialMediaInfo,
  setIsContentCreator,
  addAudiencePreference,
  getAudiencePreference,
  removeAudiencePreference,
  removePlataform,
  updateStripeAccountInfo
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', registerUser);
router.post('/verify-email', verifyEmail);
router.post('/auth', authUser);
router.post('/logout', logoutUser);
router.post('/my-profile-image', updateUserProfileImage);
router.post('/create-user-connect-account',createUserConnectAccount);
router.post('/create-company-connect-account',createCompanyConnectAccount);
router.post('/update-user-profile',updateUserProfile);
router.post('/notifications',getMyNotifications);
router.get('/autologin', autoLogin);
router.post('/external-account', getExternalAccount);
router.get('/user-profile', getUserProfile);
router.post('/user-profile', getUserProfile);
router.post('/reset-password', resetPassword);
router.post('/change-password', changePassword);
router.post('/send-reset-password-email', sendResetPasswordEmail);
router.post('/contact-us', contactUs);
router.post('/add-company', addCompany);
router.post('/edit-company', editCompany);
router.get('/get-companies', getCompanies);
router.post('/remove-company', removeCompany);
router.post('/my-company', getCompany);
router.post('/image-gallery', imageGallery);
router.post('/get-image-gallery', getImageGallery);
router.post('/clear-notifications', clearUserNotifications);
router.post('/send-message', sendMessage);
router.post('/remove-gallery-image', removeGalleryImage);
router.post('/seller-profile', getSellerProfile);
router.post('/rate-buyer', rateBuyer);
router.post('/rate-seller', rateSeller);
router.post('/set-is-content-creator', setIsContentCreator);
router.post('/add-social-media-info', addSocialMediaInfo);
router.post('/add-audience-preference', addAudiencePreference);
router.post('/get-social-media-info', getSocialMediaInfo);
router.post('/get-audience-preference', getAudiencePreference);
router.post('/remove-audience-preference', removeAudiencePreference);
router.post('/remove-plataform', removePlataform);
router.post('/update-account-stripe-info', updateStripeAccountInfo);


//router.route('/seller-profile').get(protect, getSellerProfile)
//   .put(protect, updateUserAddress);

router.post('/test', testRoute);

export default router;