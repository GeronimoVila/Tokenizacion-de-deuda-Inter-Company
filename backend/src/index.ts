import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { probarConexionBFA } from './services/blockchain.js';

const app = express();
const PORT = 4000;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("🚨 ERROR FATAL: No se encontró DATABASE_URL en el archivo .env del backend");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());


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
      dbUser = await prisma.user.create({
        data: {
          email: email,
          name: name || "Usuario Google",
          image: image,
        },
      });
      console.log(`[Seguridad] Nuevo usuario registrado: ${email}`);
    } else {
      console.log(`[Seguridad] Usuario logueado exitosamente: ${email}`);
    }

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