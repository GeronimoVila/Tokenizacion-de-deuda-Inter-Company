// backend/src/controllers/configuracion.controller.ts
import { Response } from 'express';
import { prisma } from '../config/prisma.js';
// Importamos AuthRequest desde nuestro middleware en lugar del Request estándar de express
import { AuthRequest } from '../middlewares/auth.middleware.js';

// Extraemos los roles de nuestro estándar
const ROLES = {
  SYSADMIN: 1,
  ADMIN_HOLDING: 2,
  ADMIN_SUBSIDIARIA: 3,
};

// Cambiamos 'req: Request' por 'req: AuthRequest'
export const obtenerPerfilCorporativo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario; // Ahora TypeScript reconoce esta propiedad sin errores

    if (usuario?.rol_id === ROLES.ADMIN_HOLDING) {
      const holding = await prisma.grupos_empresariales.findUnique({
        where: { id: usuario.grupo_id! },
        select: { id: true, nombre: true, cuit: true, activo: true }
      });
      res.status(200).json({ tipo: 'HOLDING', data: holding });
      return;
    }

    if (usuario?.rol_id === ROLES.ADMIN_SUBSIDIARIA) {
      const empresa = await prisma.empresas.findUnique({
        where: { id: usuario.empresa_id! },
        select: { id: true, nombre: true, cuit: true, wallet_address: true, activa: true }
      });
      res.status(200).json({ tipo: 'SUBSIDIARIA', data: empresa });
      return;
    }

    res.status(403).json({ error: "Rol no autorizado para visualizar perfiles corporativos." });
  } catch (error) {
    console.error("[Config Controller] Error obteniendo perfil:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

export const actualizarPerfilHolding = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nombre, cuit } = req.body;
    const holdingId = req.usuario?.grupo_id;

    if (!holdingId) {
      res.status(400).json({ error: "Su usuario no está vinculado a un Holding válido." });
      return;
    }

    const holdingActualizado = await prisma.grupos_empresariales.update({
      where: { id: holdingId },
      data: { nombre, cuit }
    });

    res.status(200).json({ mensaje: "Datos del holding actualizados correctamente.", data: holdingActualizado });
  } catch (error) {
    console.error("[Config Controller] Error actualizando holding:", error);
    res.status(500).json({ error: "Error interno al actualizar el holding." });
  }
};

export const actualizarPerfilSubsidiaria = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nombre, cuit, wallet_address } = req.body;
    const empresaId = req.usuario?.empresa_id;

    if (!empresaId) {
      res.status(400).json({ error: "Su usuario no está vinculado a una Subsidiaria válida." });
      return;
    }

    const empresaActualizada = await prisma.empresas.update({
      where: { id: empresaId },
      data: { nombre, cuit, wallet_address }
    });

    res.status(200).json({ mensaje: "Datos de la subsidiaria actualizados correctamente.", data: empresaActualizada });
  } catch (error) {
    console.error("[Config Controller] Error actualizando subsidiaria:", error);
    res.status(500).json({ error: "Error interno al actualizar la subsidiaria." });
  }
};