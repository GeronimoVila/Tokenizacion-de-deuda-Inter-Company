import 'dotenv/config'; 
import express, { Request, Response } from 'express';
import cors from 'cors';
import { probarConexionBFA } from './services/blockchain.js';
import empresasRoutes from './routes/empresas.routes.js';
import sysadminRoutes from './routes/sysadmin.routes.js';
import authRoutes from './routes/auth.routes.js';
import deudasRoutes from './routes/deudas.routes.js';
import nettingRoutes from './routes/netting.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import auditoriaRoutes from './routes/auditoria.routes.js';
import configuracionRoutes from './routes/configuracion.routes.js';
import metricsRoutes from './routes/metrics.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ 
  origin: [
    'http://localhost:3000', 
    'https://tokenizaciondeudaintercompany.vercel.app'
  ], 
  credentials: true 
}));

app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    estado: "Activo",
    modulo: "Motor Central MVP Deuda Inter-Company",
    red_blockchain: "BFA",
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/deudas', deudasRoutes);
app.use('/api/netting', nettingRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/sysadmin', sysadminRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/metrics', metricsRoutes);

app.listen(PORT, async () => {
  console.log(`🚀 API REST Node.js/Express corriendo en puerto ${PORT}`);
  await probarConexionBFA();
});