import express from 'express';
import {
    getListPropertyRoutes
} from '../controllers/listPropertyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', getListPropertyRoutes);

export default router;