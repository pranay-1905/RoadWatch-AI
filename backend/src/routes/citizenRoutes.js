import express from 'express';
import { submitReport, trackReport, getCitizenReports } from '../controllers/citizenController.js';
import { upload } from '../config/multer.js';

const router = express.Router();

router.get('/reports', getCitizenReports);

// Accept multiple photos (field name 'photos', up to 5) as well as single 'photo'
router.post('/report', upload.fields([{ name: 'photos', maxCount: 5 }, { name: 'photo', maxCount: 1 }]), submitReport);
router.get('/track/:trackingId', trackReport);

export default router;
