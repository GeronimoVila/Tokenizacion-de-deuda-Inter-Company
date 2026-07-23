import { Router } from 'express';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';
import { obtenerMetricas } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/metrics', requerirRol([ROLES.SYSADMIN, ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA, ROLES.OPERADOR, ROLES.AUDITOR]), obtenerMetricas);

export default router;