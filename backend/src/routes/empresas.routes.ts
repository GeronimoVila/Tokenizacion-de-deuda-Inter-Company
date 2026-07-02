import { Router } from 'express';
import { obtenerEmpresasDelHolding } from '../controllers/empresas.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';

const router = Router();
router.get('/holding', requerirRol([ROLES.SYSADMIN, ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA, ROLES.OPERADOR]), obtenerEmpresasDelHolding);

export default router;