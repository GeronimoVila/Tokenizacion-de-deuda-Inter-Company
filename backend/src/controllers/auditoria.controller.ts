import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { FiltrosAuditoria } from '../types/auditoria.types.js';

export const ROLES = {
  SYSADMIN: 1,
  ADMIN_HOLDING: 2,
  ADMIN_SUBSIDIARIA: 3,
  OPERADOR: 4,
  AUDITOR: 5,
} as const;

export const buscarHistorialTokens = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    
    if (!usuario?.grupo_id) {
      res.status(403).json({ error: "Usuario sin grupo empresarial asignado." });
      return;
    }

    const {
      fechaInicio,
      fechaFin,
      contraparteId,
      montoMin,
      montoMax,
      estadoToken
    } = req.query as FiltrosAuditoria;

    const transaccionWhere: Prisma.Transacciones_deudaWhereInput = {
      empresa_emisora: { grupo_id: usuario.grupo_id }
    };

    // 1. Corrección: Aislamiento estricto para múltiples roles
    const rolesRestringidos: number[] = [ROLES.ADMIN_SUBSIDIARIA, ROLES.OPERADOR, ROLES.AUDITOR];
    
    if (usuario.rol_id && rolesRestringidos.includes(usuario.rol_id)) {
      if (!usuario.empresa_id) {
        res.status(403).json({ error: "El usuario no tiene una subsidiaria asignada." });
        return;
      }
      
      transaccionWhere.OR = [
        { empresa_emisora_id: usuario.empresa_id },
        { empresa_receptora_id: usuario.empresa_id }
      ];
    }

    // 2. Corrección: Filtro inteligente por empresa involucrada (contraparte)
    if (contraparteId && !isNaN(Number(contraparteId))) {
      const filtroContraparte = {
        OR: [
          { empresa_emisora_id: Number(contraparteId) },
          { empresa_receptora_id: Number(contraparteId) }
        ]
      };

      if (transaccionWhere.OR) {
        // Si el usuario ya está filtrado por su propia subsidiaria (RBAC), 
        // combinamos ambas condiciones con un AND estricto en PostgreSQL.
        transaccionWhere.AND = [
          { OR: transaccionWhere.OR },
          filtroContraparte
        ];
        delete transaccionWhere.OR;
      } else {
        transaccionWhere.OR = filtroContraparte.OR;
      }
    }

    if (fechaInicio || fechaFin) {
      transaccionWhere.fecha_validacion = {};
      if (fechaInicio) transaccionWhere.fecha_validacion.gte = new Date(fechaInicio);
      if (fechaFin) {
        const fechaFinObj = new Date(fechaFin);
        fechaFinObj.setUTCHours(23, 59, 59, 999);
        transaccionWhere.fecha_validacion.lte = fechaFinObj;
      }
    }

    const whereClause: Prisma.Tokens_deudaWhereInput = {
      transaccion: transaccionWhere
    };

    if (montoMin || montoMax) {
      whereClause.monto_actual = {};
      if (montoMin && !isNaN(Number(montoMin))) whereClause.monto_actual.gte = new Prisma.Decimal(montoMin);
      if (montoMax && !isNaN(Number(montoMax))) whereClause.monto_actual.lte = new Prisma.Decimal(montoMax);
    }

    if (estadoToken === 'Activo' || estadoToken === 'Quemado') {
      whereClause.estado_token = estadoToken;
    }

    const historialTokens = await prisma.tokens_deuda.findMany({
      where: whereClause,
      include: {
        transaccion: {
          select: {
            detalle: true,
            url_documento_respaldo: true,
            fecha_validacion: true,
            empresa_emisora: { select: { nombre: true, cuit: true } },
            empresa_receptora: { select: { nombre: true, cuit: true } }
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    res.status(200).json({ success: true, data: historialTokens });

  } catch (error) {
    console.error("[Auditoría Web3] Error al filtrar el historial:", error);
    res.status(500).json({ error: "Error interno al procesar la auditoría de tokens." });
  }
};