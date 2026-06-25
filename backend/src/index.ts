import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import { probarConexionBFA } from './services/blockchain.js';
import deudasRoutes from './routes/deudas.routes.js';
import { prisma } from './config/prisma.js';

const app = express();
const PORT = 4000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/deudas', deudasRoutes);

app.get('/', (req, res) => {
  res.send('API del Holding Financiero funcionando perfectamente 🚀');
});

app.post('/api/auth/sync', async (req, res) => {
  const { email, name, image } = req.body;

  if (!email) {
    return res.status(400).json({ error: "El email es obligatorio" });
  }

  try {
    let dbUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!dbUser) {
      console.warn(`🚨 [Seguridad] Intento de login bloqueado. Email no invitado: ${email}`);
      return res.status(403).json({ 
        error: "Acceso denegado. Tu email no ha sido invitado al Holding." 
      });
    }

    dbUser = await prisma.user.update({
      where: { email: email },
      data: {
        name: name || dbUser.name,
        image: image || dbUser.image,
      },
    });

    console.log(`✅ [Seguridad] Usuario verificado y sincronizado: ${email} (Rol: ${dbUser.rol_id})`);
    res.status(200).json({ success: true, user: dbUser });

  } catch (error) {
    console.error("[Seguridad] Error en /api/auth/sync:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.listen(PORT, async () => {
  console.log(`=========================================`);
  console.log(`🚀 Servidor Backend corriendo en el puerto ${PORT}`);
  console.log(`=========================================`);
  
  await probarConexionBFA();
});