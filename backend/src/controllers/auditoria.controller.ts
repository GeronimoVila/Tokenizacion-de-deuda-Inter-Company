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

    const { fechaInicio, fechaFin, contraparteId, montoMin, montoMax, estadoToken } = req.query as FiltrosAuditoria;

    const whereClause: Prisma.Transacciones_deudaWhereInput = {
      empresa_emisora: { grupo_id: usuario.grupo_id }
    };

    const rolesRestringidos: number[] = [ROLES.ADMIN_SUBSIDIARIA, ROLES.OPERADOR, ROLES.AUDITOR];
    
    if (usuario.rol_id && rolesRestringidos.includes(usuario.rol_id)) {
      if (!usuario.empresa_id) {
        res.status(403).json({ error: "El usuario no tiene una subsidiaria asignada." });
        return;
      }
      
      whereClause.OR = [
        { empresa_emisora_id: usuario.empresa_id },
        { empresa_receptora_id: usuario.empresa_id }
      ];
    }

    if (contraparteId && !isNaN(Number(contraparteId))) {
      const filtroContraparte = {
        OR: [
          { empresa_emisora_id: Number(contraparteId) },
          { empresa_receptora_id: Number(contraparteId) }
        ]
      };

      if (whereClause.OR) {
        whereClause.AND = [ { OR: whereClause.OR }, filtroContraparte ];
        delete whereClause.OR;
      } else {
        whereClause.OR = filtroContraparte.OR;
      }
    }

    if (fechaInicio || fechaFin) {
      whereClause.fecha_creacion = {};
      if (fechaInicio) whereClause.fecha_creacion.gte = new Date(fechaInicio);
      if (fechaFin) {
        const fechaFinObj = new Date(fechaFin);
        fechaFinObj.setUTCHours(23, 59, 59, 999);
        whereClause.fecha_creacion.lte = fechaFinObj;
      }
    }

    if (montoMin || montoMax) {
      whereClause.monto = {};
      if (montoMin && !isNaN(Number(montoMin))) whereClause.monto.gte = new Prisma.Decimal(montoMin);
      if (montoMax && !isNaN(Number(montoMax))) whereClause.monto.lte = new Prisma.Decimal(montoMax);
    }

    if (estadoToken) {
      whereClause.estado_validacion = estadoToken;
    }

    const historialTransacciones = await prisma.transacciones_deuda.findMany({
  where: whereClause,
  include: {
    empresa_emisora: { select: { nombre: true, cuit: true } },
    empresa_receptora: { select: { nombre: true, cuit: true } },
    tokens_deuda: {
      select: {
        token_id_blockchain: true,
        estado_token: true,
        txhash_mint: true,
        txhash_burn: true,
        block_number: true
      }
    }
  },
  orderBy: { id: 'desc' }
});

    res.status(200).json({ success: true, data: historialTransacciones });

  } catch (error) {
    console.error("[Auditoría Web3] Error al filtrar el historial:", error);
    res.status(500).json({ error: "Error interno al procesar la auditoría de operaciones." });
  }
};

export const auditarCierresPasivos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;

    // Validación base para proteger la segmentación de datos del holding
    if (!usuario?.grupo_id) {
      res.status(403).json({ error: "Usuario sin grupo empresarial asignado." });
      return;
    }

    const rolesRestringidos: number[] = [ROLES.ADMIN_SUBSIDIARIA, ROLES.OPERADOR, ROLES.AUDITOR];
    
    // Filtro base: Restringimos la búsqueda SÓLO a las empresas de este holding específico
    let whereNettingClause: Prisma.CompensacionesWhereInput = {
      usuario_ejecutor: { grupo_id: usuario.grupo_id }
    };
    
    if (usuario.rol_id && rolesRestringidos.includes(usuario.rol_id)) {
      if (!usuario.empresa_id) return;
      
      // Si el rol es menor (Subsidiaria), re-asignamos el filtro para limitar aún más:
      // solo debe ver los netings donde su empresa específica estuvo involucrada.
      whereNettingClause = {
        detalles: {
          some: {
            token: {
              transaccion: {
                OR: [
                  { empresa_emisora_id: usuario.empresa_id },
                  { empresa_receptora_id: usuario.empresa_id }
                ]
              }
            }
          }
        }
      };
    }

    const historialNetting = await prisma.compensaciones.findMany({
      where: whereNettingClause,
      include: {
        usuario_ejecutor: { select: { name: true, email: true } },
        detalles: {
          include: {
            token: {
              select: {
                token_id_blockchain: true,
                txhash_burn: true,
                transaccion: {
                  select: {
                    empresa_emisora: { select: { nombre: true, cuit: true } },
                    empresa_receptora: { select: { nombre: true, cuit: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    let whereTokensLiquidados: Prisma.Tokens_deudaWhereInput = {
      txhash_burn: { not: null },
      compensaciones: { none: {} },
      // Filtramos para asegurar que solo devuelva tokens que pertenecen a empresas del holding del usuario
      transaccion: {
          empresa_emisora: { grupo_id: usuario.grupo_id }
      }
    };

    if (usuario.rol_id && rolesRestringidos.includes(usuario.rol_id)) {
      whereTokensLiquidados.transaccion = {
        OR: [
          { empresa_emisora_id: usuario.empresa_id! },
          { empresa_receptora_id: usuario.empresa_id! }
        ]
      };
    }

    const tokensLiquidados = await prisma.tokens_deuda.findMany({
      where: whereTokensLiquidados,
      include: {
        transaccion: {
          select: {
            fecha_creacion: true,
            monto: true,
            empresa_emisora: { select: { nombre: true, cuit: true } },
            empresa_receptora: { select: { nombre: true, cuit: true } }
          }
        }
      }
    });

    const liquidacionesMap = new Map<string, any>();
    
    tokensLiquidados.forEach(t => {
      const hash = t.txhash_burn as string;
      if (!liquidacionesMap.has(hash)) {
        liquidacionesMap.set(hash, {
          id: `LIQ-${hash.substring(0, 6).toUpperCase()}`,
          tipo: 'Liquidación Bancaria (Manual)',
          fecha: t.transaccion.fecha_creacion,
          descripcion: 'Liquidación de Saldo (Transferencia/Fuera de sistema)',
          operador: 'Conciliación Externa',
          tokens_quemados: []
        });
      }
      
      liquidacionesMap.get(hash).tokens_quemados.push({
        id_token: t.token_id_blockchain,
        txhash_burn: hash,
        monto_saldado: t.transaccion.monto.toString(),
        acreedor: t.transaccion.empresa_emisora.nombre,
        deudor: t.transaccion.empresa_receptora.nombre
      });
    });

    const historialLiquidaciones = Array.from(liquidacionesMap.values());

    const resultadosEstandarizados = [
      ...historialNetting.map(n => ({
        id: `COMP-${n.id}`,
        tipo: 'Netting Algorítmico',
        fecha: n.fecha,
        descripcion: n.descripcion,
        operador: n.usuario_ejecutor?.name || n.usuario_ejecutor?.email || 'Sistema',
        tokens_quemados: n.detalles.map(d => ({
          id_token: d.token.token_id_blockchain,
          txhash_burn: d.token.txhash_burn,
          monto_saldado: d.monto_compensado.toString(),
          acreedor: d.token.transaccion.empresa_emisora.nombre,
          deudor: d.token.transaccion.empresa_receptora.nombre
        }))
      })),
      ...historialLiquidaciones
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    res.status(200).json({ success: true, data: resultadosEstandarizados });

  } catch (error) {
    console.error("[Auditoría Web3] Error al auditar cierres de pasivos:", error);
    res.status(500).json({ error: "Error interno al procesar la auditoría de Quema de Tokens." });
  }
};