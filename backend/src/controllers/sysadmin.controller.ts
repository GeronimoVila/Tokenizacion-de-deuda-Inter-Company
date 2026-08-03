import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const ROLES = {
  SYSADMIN: 1,
  ADMIN_HOLDING: 2,
  ADMIN_SUBSIDIARIA: 3,
  OPERADOR: 4,
  AUDITOR: 5,
} as const;

export interface CrearHoldingRequest {
  nombre: string;
  cuit: string;
  adminEmail: string;
  nombreAdmin: string;
}

export const registrarNuevoHolding = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawEmailHeader = req.headers['x-user-email'];
    const sysadminEmail: string | undefined = Array.isArray(rawEmailHeader) 
      ? rawEmailHeader[0] 
      : (rawEmailHeader as string | undefined);

    const { nombre, cuit, adminEmail, nombreAdmin } = req.body as CrearHoldingRequest;

    if (!nombre || !cuit || !adminEmail || !nombreAdmin) {
      res.status(400).json({ error: "Nombre, CUIT, nombre del admin y correo corporativo son obligatorios." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      res.status(400).json({ error: "El formato del correo electrónico corporativo es inválido." });
      return;
    }

    const resultado = await prisma.$transaction(async (tx) => {
      
      const holdingExistente = await tx.grupos_empresariales.findFirst({
        where: { cuit: cuit }
      });

      if (holdingExistente) {
        throw new Error("El CUIT ingresado ya se encuentra registrado en el sistema.");
      }

      const nuevoHolding = await tx.grupos_empresariales.create({
        data: {
          nombre: nombre,
          cuit: cuit,
          activo: true 
        }
      });

      const nuevoAdmin = await tx.user.create({
        data: {
          name: nombreAdmin,
          email: adminEmail,
          
          grupo: {
            connect: { id: nuevoHolding.id } 
          },

          rol: {
            connect: { id: ROLES.ADMIN_HOLDING } 
          }
        }
      });

      return {
        holding: nuevoHolding,
        admin: nuevoAdmin
      };
    });

    res.status(201).json({
      mensaje: "Entorno corporativo inicializado llave en mano con éxito.",
      data: resultado
    });

  } catch (error: any) {
    console.error("[Sysadmin Controller] Error en el Onboarding:", error);
    
    if (error.message.includes("CUIT ingresado ya se encuentra registrado")) {
        res.status(409).json({ error: error.message });
        return;
    }

    res.status(500).json({ error: "Error interno del servidor durante el registro del holding." });
  }
};

export const listarHoldings = async (req: Request, res: Response): Promise<void> => {
  try {
    const holdings = await prisma.grupos_empresariales.findMany({
      orderBy: { fecha_creacion: 'desc' }
    });
    res.status(200).json(holdings);
  } catch (error) {
    console.error("[Sysadmin Controller] Error listando holdings:", error);
    res.status(500).json({ error: "Error interno al obtener los grupos empresariales." });
  }
};

export const toggleEstadoHolding = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const stringId: string = Array.isArray(rawId) ? rawId[0] : (rawId as string);
    const holdingId = parseInt(stringId);
    
    const { activo } = req.body;

    if (isNaN(holdingId) || typeof activo !== 'boolean') {
      res.status(400).json({ error: "ID de holding inválido o estado no proporcionado." });
      return;
    }

    const holding = await prisma.grupos_empresariales.update({
      where: { id: holdingId },
      data: { activo }
    });

    res.status(200).json({
      mensaje: `Holding ${activo ? 'reactivado' : 'suspendido'} exitosamente.`,
      holding
    });
  } catch (error) {
    console.error("[Sysadmin Controller] Error cambiando estado del holding:", error);
    res.status(500).json({ error: "Error interno al modificar el estado del grupo empresarial." });
  }
};