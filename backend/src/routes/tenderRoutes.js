import express from 'express';
import { 
  getAllTenders, 
  createTender, 
  submitBid, 
  awardTender 
} from '../controllers/tenderController.js';

const router = express.Router();

router.get('/', getAllTenders);
router.post('/', createTender);
router.post('/:id/bid', submitBid);
router.patch('/:id/award', awardTender);

export default router;
