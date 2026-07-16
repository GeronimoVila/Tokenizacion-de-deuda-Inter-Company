import { Router } from 'express';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';
import { preRegistrarUsuario, obtenerUsuarios } from '../controllers/usuarios.controller.js';

const router = Router();

router.get('/', requerirRol([ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA]), obtenerUsuarios);

router.post('/', requerirRol([ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA]), preRegistrarUsuario);

export default router;