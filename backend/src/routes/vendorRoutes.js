import express from 'express';
import { getVendorsWithScores } from '../controllers/vendorController.js';

const router = express.Router();

router.get('/', getVendorsWithScores);

export default router;
