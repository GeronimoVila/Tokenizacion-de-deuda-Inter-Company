import { Router } from 'express';
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js';
import { 
  obtenerEmpresasDelHolding, 
  listarTodasLasEmpresas, 
  crearEmpresa, 
  editarEmpresa, 
  desactivarEmpresa, 
  activarEmpresa
} from '../controllers/empresas.controller.js';

const router = Router();

router.get('/operativas', requerirRol([ROLES.ADMIN_HOLDING, ROLES.ADMIN_SUBSIDIARIA, ROLES.OPERADOR]), obtenerEmpresasDelHolding);

router.get('/', requerirRol([ROLES.ADMIN_HOLDING]), listarTodasLasEmpresas);

router.post('/', requerirRol([ROLES.ADMIN_HOLDING]), crearEmpresa);

router.put('/:id', requerirRol([ROLES.ADMIN_HOLDING]), editarEmpresa);

router.patch('/:id/desactivar', requerirRol([ROLES.ADMIN_HOLDING]), desactivarEmpresa);

router.patch('/:id/activar', requerirRol([ROLES.ADMIN_HOLDING]), activarEmpresa);

export default router;