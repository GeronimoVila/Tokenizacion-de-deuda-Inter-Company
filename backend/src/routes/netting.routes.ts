import { Router } from 'express';
import { simularNetting, ejecutarNetting } from '../controllers/netting.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/simular', requerirRol([ROLES.ADMIN_HOLDING, ROLES.SYSADMIN]), simularNetting);

router.post('/ejecutar', requerirRol([ROLES.ADMIN_HOLDING, ROLES.SYSADMIN]), ejecutarNetting);

export default router;