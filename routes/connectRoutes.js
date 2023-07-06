import express from 'express';
import {
    CustomersConnect
} from '../controllers/connectController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post('/', CustomersConnect);

export default router;