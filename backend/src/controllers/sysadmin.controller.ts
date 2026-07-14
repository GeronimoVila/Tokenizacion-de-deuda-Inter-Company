import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

const isValidCUIT = (cuit: string): boolean => {
  const cuitRegex = /^\d{11}$/;
  return cuitRegex.test(cuit);
};

export const createHolding = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, cuit } = req.body;

    if (!nombre || !cuit) {
      res.status(400).json({ error: 'El nombre y el CUIT son obligatorios.' });
      return;
    }

    const cuitLimpio = cuit.replace(/[^0-9]/g, '');
    if (!isValidCUIT(cuitLimpio)) {
      res.status(400).json({ error: 'Formato de CUIT inválido. Deben ser 11 números.' });
      return;
    }

    const existingHolding = await prisma.grupos_empresariales.findFirst({
      where: { cuit: cuitLimpio }
    });

    if (existingHolding) {
      res.status(409).json({ error: 'El grupo empresarial ya se encuentra registrado.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const nuevoHolding = await tx.grupos_empresariales.create({
        data: {
          nombre,
          cuit: cuitLimpio,
        }
      });
      return nuevoHolding;
    });

    res.status(201).json({
      message: 'Grupo empresarial registrado exitosamente.',
      data: result
    });

  } catch (error) {
    console.error('[SysadminController - createHolding] Error:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear el Holding.' });
  }
};