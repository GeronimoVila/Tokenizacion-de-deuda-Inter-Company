import { Router } from 'express';
import { registrarNuevoHolding, listarHoldings, toggleEstadoHolding  } from '../controllers/sysadmin.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route POST /api/sysadmin/holding
 * @desc Inicializa un nuevo grupo empresarial y su Administrador General.
 * @access Restringido - Solo SYSADMIN
 */
router.post( '/holding', requerirRol([ROLES.SYSADMIN]), registrarNuevoHolding );

router.get('/holding', requerirRol([ROLES.SYSADMIN]), listarHoldings);

router.patch('/holding/:id/toggle-status', requerirRol([ROLES.SYSADMIN]), toggleEstadoHolding);

export default router;