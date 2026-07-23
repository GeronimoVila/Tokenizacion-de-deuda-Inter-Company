import { Router } from 'express';
import { registrarDeuda, aprobarDeuda, rechazarDeuda, obtenerDashboard, obtenerDeudasPendientes } from '../controllers/deudas.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.post('/registrar', requerirRol([ROLES.OPERADOR, ROLES.ADMIN_SUBSIDIARIA]), upload.single('comprobante'), registrarDeuda);

router.post('/:id/aprobar', requerirRol([ROLES.ADMIN_SUBSIDIARIA]), aprobarDeuda);

router.post('/:id/rechazar', requerirRol([ROLES.ADMIN_SUBSIDIARIA]), rechazarDeuda);

router.get('/dashboard', requerirRol([ROLES.OPERADOR, ROLES.ADMIN_SUBSIDIARIA, ROLES.ADMIN_HOLDING, ROLES.SYSADMIN]), obtenerDashboard);

router.get('/pendientes', requerirRol([ROLES.SYSADMIN, ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA, ROLES.OPERADOR, ROLES.AUDITOR]), obtenerDeudasPendientes);

export default router;