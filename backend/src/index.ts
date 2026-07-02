import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import { probarConexionBFA } from './services/blockchain.js';
import empresasRoutes from './routes/empresas.routes.js';

import authRoutes from './routes/auth.routes.js';
import deudasRoutes from './routes/deudas.routes.js';
import nettingRoutes from './routes/netting.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/deudas', deudasRoutes);
app.use('/api/netting', nettingRoutes);
app.use('/api/empresas', empresasRoutes);

app.listen(PORT, async () => {
  console.log(`🚀 API REST Node.js/Express corriendo en puerto ${PORT}`);
  await probarConexionBFA();
});