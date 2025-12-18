import express from 'express';
import { 
  startInterview, 
  submitRound, 
  getResults,
  getUserProgress,
  updateUserProgress,
  startNewInterview
} from '../controllers/interviewController.js';

const router = express.Router();

router.post('/start', startInterview);
router.post('/submit', submitRound);
router.get('/results/:interviewId', getResults);

// 🆕 ADD THESE ROUTES FOR PROGRESS TRACKING
router.get('/progress/:userId', getUserProgress);
router.post('/update-progress', updateUserProgress);
router.post('/start-new', startNewInterview);

// 🆕 ADD THIS MISSING ROUTE
router.get('/results/user/:userId', getResults);

export default router;