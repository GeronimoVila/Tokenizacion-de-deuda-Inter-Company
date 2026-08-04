import { Router } from 'express';
import { 
  obtenerPerfilCorporativo, 
  actualizarPerfilHolding, 
  actualizarPerfilSubsidiaria 
} from '../controllers/configuracion.controller.js';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';

const router = Router();

// Endpoint compartido para que la vista sepa qué datos cargar
router.get('/perfil', requerirRol([ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA]), obtenerPerfilCorporativo);

// Endpoint exclusivo para Administradores de Holding
router.put('/holding', requerirRol([ROLES.ADMIN_HOLDING]), actualizarPerfilHolding);

// Endpoint exclusivo para Administradores de Subsidiaria
router.put('/subsidiaria', requerirRol([ROLES.ADMIN_SUBSIDIARIA]), actualizarPerfilSubsidiaria);

export default router;