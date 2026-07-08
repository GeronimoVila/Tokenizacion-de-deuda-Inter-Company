import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const verifyAndSyncUser = async (req: Request, res: Response): Promise<any> => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email requerido." });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        rol_id: true,
        empresa_id: true,
        grupo_id: true,
      }
    });

    if (!dbUser) {
      console.warn(`🚨 Login bloqueado: ${email} no pertenece al Holding.`);
      return res.status(403).json({ error: "Acceso denegado. Usuario no registrado." });
    }

    if (!dbUser.rol_id || !dbUser.empresa_id) {
      console.error(`🚨 Perfil incompleto para: ${email}`);
      return res.status(403).json({ error: "Usuario sin rol o empresa asignada." });
    }

    return res.status(200).json({ success: true, data: dbUser });

  } catch (error) {
    console.error("🚨 Error en Auth Controller:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};