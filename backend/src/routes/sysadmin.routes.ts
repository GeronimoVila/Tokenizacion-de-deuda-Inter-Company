import { Router } from 'express';
import { createHolding } from '../controllers/sysadmin.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';

const router = Router();

router.post(
  '/holdings', 
  requerirRol([ROLES.SYSADMIN]), 
  createHolding
);

export default router;