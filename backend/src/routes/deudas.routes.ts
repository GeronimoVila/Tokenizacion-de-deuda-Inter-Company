import { Router } from 'express';
import { registrarDeuda } from '../controllers/deudas.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/registrar', requerirRol([ROLES.OPERADOR]), registrarDeuda);

export default router;