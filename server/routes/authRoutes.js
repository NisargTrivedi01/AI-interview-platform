import express from 'express';
import { signup, login, verifyToken, getProfile, healthCheck } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/verify', verifyToken); // 🆕 ADD THIS LINE
router.get('/profile', getProfile);
router.get('/health', healthCheck);

export default router;