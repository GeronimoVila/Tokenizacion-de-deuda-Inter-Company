import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';

export const obtenerEmpresasDelHolding = async (req: AuthRequest, res: Response) => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) return res.status(403).json({ error: "Usuario sin grupo asignado." });

    const empresas = await prisma.empresas.findMany({
      where: { 
        grupo_id: usuario.grupo_id,
        id: { not: usuario.empresa_id }
      },
      select: { id: true, nombre: true }
    });

    res.status(200).json({ success: true, data: empresas });
  } catch (error) {
    res.status(500).json({ error: "Error interno al obtener empresas." });
  }
};