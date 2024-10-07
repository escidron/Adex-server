import express from 'express';
import { createReverseListing } from '../controllers/reverseListingController.js';

const router = express.Router();


router.post('/new', createReverseListing);
export default router;