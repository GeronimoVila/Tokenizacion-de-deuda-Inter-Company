import 'dotenv/config'; // ¡Clave! Hace que Node.js lea tu archivo .env automáticamente
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const app = express();
const PORT = 4000;

// --- CONFIGURACIÓN DE PRISMA 7.8.0 ---
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("🚨 ERROR FATAL: No se encontró DATABASE_URL en el archivo .env del backend");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- MIDDLEWARES ---
// Permitimos que tu Frontend (puerto 3000) le hable a este Backend (puerto 4000)
app.use(cors({ origin: 'http://localhost:3000' }));
// Permitimos que el backend entienda el formato JSON
app.use(express.json());

// --- RUTAS (ENDPOINTS) ---

// Ruta de prueba para saber si el backend está vivo
app.get('/', (req, res) => {
  res.send('API del Holding Financiero funcionando perfectamente 🚀');
});

// Ruta de sincronización de seguridad (NextAuth -> Backend -> Prisma)
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
          // rol_id y empresa_id quedan nulos para que un Admin los asigne luego
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

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Servidor Backend corriendo en el puerto ${PORT}`);
  console.log(`=========================================`);
});