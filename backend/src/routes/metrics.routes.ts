import { Router } from 'express';
import { MetricsController } from '../controllers/metrics.controller.js'; 
import { requerirRol, ROLES } from '../middlewares/auth.middleware.js'; 

const router = Router();
const metricsController = new MetricsController();

router.get( '/holding-burn', requerirRol([ROLES.ADMIN_HOLDING]), metricsController.getHoldingMetrics);

router.get( '/system-burn', requerirRol([ROLES.SYSADMIN]), metricsController.getSysadminMetrics);

export default router;