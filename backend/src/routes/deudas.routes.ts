import { Router } from 'express';
import { registrarDeuda, aprobarDeuda, obtenerDashboard } from '../controllers/deudas.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.post('/registrar', requerirRol([ROLES.OPERADOR]), upload.single('comprobante'), registrarDeuda);

router.post('/:id/aprobar', requerirRol([ROLES.OPERADOR]), aprobarDeuda);

router.get('/dashboard', requerirRol([ROLES.OPERADOR, ROLES.ADMIN_HOLDING]), obtenerDashboard);

export default router;