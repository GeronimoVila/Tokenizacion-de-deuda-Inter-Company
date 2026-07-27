import { Router } from 'express';
import { registrarNuevoHolding } from '../controllers/sysadmin.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route POST /api/sysadmin/holding
 * @desc Inicializa un nuevo grupo empresarial y su Administrador General.
 * @access Restringido - Solo SYSADMIN
 */
router.post(
  '/holding', requerirRol([ROLES.SYSADMIN]), registrarNuevoHolding);

export default router;