import express from 'express';
import { 
  getAllPotholes, 
  getPotholeById, 
  syncEdgeBatch, 
  updatePotholeStatus,
  uploadRepairEvidence 
} from '../controllers/potholeController.js';
import { upload } from '../config/multer.js';

const router = express.Router();

// Edge sync endpoint (Raspberry Pi 3B+ connects here via Wi-Fi)
router.post('/sync', upload.single('photo'), syncEdgeBatch);

// Read potholes & filtering
router.get('/', getAllPotholes);
router.get('/:id', getPotholeById);

// Update status
router.patch('/:id/status', updatePotholeStatus);

// Contractor repair proof upload
router.post('/:id/verify-repair', upload.single('photo'), uploadRepairEvidence);

export default router;
