// backend/src/controllers/sysadmin.controller.ts
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