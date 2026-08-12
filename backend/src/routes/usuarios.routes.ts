import { Router } from 'express';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';
import { preRegistrarUsuario, obtenerUsuarios, cambiarEstadoUsuario } from '../controllers/usuarios.controller.js';

const router = Router();

router.get('/', requerirRol([ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA]), obtenerUsuarios);

router.post('/', requerirRol([ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA]), preRegistrarUsuario);

router.patch('/:id/estado', requerirRol([ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA]), cambiarEstadoUsuario);

export default router;