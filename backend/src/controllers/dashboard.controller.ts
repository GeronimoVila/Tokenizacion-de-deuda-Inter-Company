import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';

export const obtenerMetricas = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) {
      return res.status(403).json({ error: "Usuario sin grupo asignado." });
    }

    const isGlobal = [1, 2, 5].includes(usuario.rol_id); 
    const empId = usuario.empresa_id;

    const pendingWhere: any = {
      estado_validacion: 'Pendiente de Validación',
      empresa_emisora: { grupo_id: usuario.grupo_id } 
    };

    if (!isGlobal && empId) {
      pendingWhere.empresa_receptora_id = empId;
    }

    const countPendientes = await prisma.transacciones_deuda.count({
      where: pendingWhere
    });

    const tokensWhere: any = {
      estado_token: 'Activo',
      transaccion: {
        empresa_emisora: { grupo_id: usuario.grupo_id }
      }
    };

    if (!isGlobal && empId) {
      tokensWhere.transaccion = {
        OR: [
          { empresa_emisora_id: empId },
          { empresa_receptora_id: empId }
        ]
      };
    }

    const countTokens = await prisma.tokens_deuda.count({
      where: tokensWhere
    });

    const tokensActivos = await prisma.tokens_deuda.findMany({
      where: tokensWhere,
      select: {
        monto_actual: true,
        transaccion: {
          select: {
            empresa_emisora_id: true,
            empresa_receptora_id: true
          }
        }
      }
    });

    let deudaACobrar = new Prisma.Decimal(0);
    let deudaAPagar = new Prisma.Decimal(0);

    tokensActivos.forEach(token => {
      const monto = new Prisma.Decimal(token.monto_actual);
      
      if (isGlobal) {
        deudaACobrar = deudaACobrar.plus(monto);
      } else {
        if (token.transaccion.empresa_emisora_id === empId) {
          deudaACobrar = deudaACobrar.plus(monto);
        }
        if (token.transaccion.empresa_receptora_id === empId) {
          deudaAPagar = deudaAPagar.plus(monto);
        }
      }
    });

    const saldoNeto = isGlobal ? deudaACobrar : deudaACobrar.minus(deudaAPagar);

    return res.status(200).json({
      success: true,
      data: {
        operacionesPendientes: countPendientes,
        tokensActivos: countTokens,
        saldos: {
          aCobrar: deudaACobrar.toNumber(),
          aPagar: deudaAPagar.toNumber(),
          saldoNeto: saldoNeto.toNumber()
        }
      }
    });

  } catch (error) {
    console.error("[Dashboard Controller - obtenerMetricas]", error);
    return res.status(500).json({ error: "Error interno al calcular métricas." });
  }
};