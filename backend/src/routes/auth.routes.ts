import { Router } from 'express';
import { verifyAndSyncUser } from '../controllers/auth.controller.js';

const router = Router();

router.post('/sync', verifyAndSyncUser);

export default router;