import { Request, Response } from 'express';
import { MetricsService } from '../services/metrics.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js'; 

export class MetricsController {
  private metricsService: MetricsService;

  constructor() {
    this.metricsService = new MetricsService();
  }

  public getHoldingMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const grupoId = req.usuario?.grupo_id;

      if (!grupoId) {
        res.status(403).json({ error: 'Acceso denegado. Grupo empresarial no identificado.' });
        return;
      }

      const metrics = await this.metricsService.getHoldingBurnMetrics(grupoId);
      res.status(200).json({ data: metrics });
    } catch (error) {
      console.error('Error al obtener métricas del holding:', error);
      res.status(500).json({ error: 'Error interno del servidor al calcular métricas.' });
    }
  };

  public getSysadminMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const totalBurned = await this.metricsService.getSystemTotalBurned();
      res.status(200).json({ data: { totalSistema: totalBurned } });
    } catch (error) {
      console.error('Error al obtener métricas del sistema:', error);
      res.status(500).json({ error: 'Error interno del servidor al calcular métricas.' });
    }
  };
}