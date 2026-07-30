import { Router } from 'express';
import { buscarHistorialTokens, auditarCierresPasivos } from '../controllers/auditoria.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route GET /api/auditoria/filtros
 * @desc Permite buscar comprobantes y verificar los identificadores de la Blockchain Federal Argentina.
 * @access Protegido (Administrador de Holding, Operador de Subsidiaria, Auditor)
 */
router.get(
  '/filtros', 
  requerirRol([ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA, ROLES.OPERADOR, ROLES.AUDITOR]), 
  buscarHistorialTokens
);

router.get(
  '/cierres-pasivos', 
  requerirRol([ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA, ROLES.OPERADOR, ROLES.AUDITOR]), 
  auditarCierresPasivos
);

export default router;