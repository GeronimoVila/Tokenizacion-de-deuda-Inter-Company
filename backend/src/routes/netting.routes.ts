import { Router } from 'express';
import { simularNetting, ejecutarNetting } from '../controllers/netting.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/simular', requerirRol([ROLES.SYSADMIN, ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA]), simularNetting);

router.post('/ejecutar', requerirRol([ROLES.SYSADMIN, ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA]), ejecutarNetting);

export default router;