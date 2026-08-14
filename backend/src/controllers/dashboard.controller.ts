import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';
// Asumimos que el servicio de netting exporta esta función para simular las oportunidades
import { generarPropuestaNetting } from '../services/netting.service.js';

export const obtenerMetricas = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) {
      return res.status(403).json({ error: "Usuario sin grupo asignado." });
    }

    const isGlobal = [1, 2, 5].includes(usuario.rol_id); 
    const empId = usuario.empresa_id;

    // 1. Operaciones Pendientes
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

    // 2. Tokens Activos
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
            empresa_receptora_id: true,
            empresa_emisora: { select: { nombre: true } },
            empresa_receptora: { select: { nombre: true } }
          }
        }
      }
    });

    let deudaACobrar = new Prisma.Decimal(0);
    let deudaAPagar = new Prisma.Decimal(0);
    const exposicionMap = new Map<string, Prisma.Decimal>();

    tokensActivos.forEach(token => {
      const monto = new Prisma.Decimal(token.monto_actual.toString());
      const acreedor = token.transaccion.empresa_emisora?.nombre || "Desconocida";
      const deudor = token.transaccion.empresa_receptora?.nombre || "Desconocida";
      
      if (isGlobal) {
        deudaACobrar = deudaACobrar.plus(monto);
        // Sumamos para el acreedor, restamos para el deudor para el gráfico divergente
        exposicionMap.set(acreedor, (exposicionMap.get(acreedor) || new Prisma.Decimal(0)).plus(monto));
        exposicionMap.set(deudor, (exposicionMap.get(deudor) || new Prisma.Decimal(0)).minus(monto));
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

    // 3. Métricas exclusivas para Administrador de Holding (Roles Globales)
    let holdingData = null;

    if (isGlobal) {
      // A. Operaciones creadas este mes
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const operacionesMes = await prisma.transacciones_deuda.count({
        where: {
          empresa_emisora: { grupo_id: usuario.grupo_id },
          fecha_creacion: { gte: inicioMes }
        }
      });

      // B. Ahorro Histórico por Netting (Tokens Quemados)
      const detallesCompensacion = await prisma.compensacion_Detalle.findMany({
        where: {
          // CORRECCIÓN 1: Usamos el nombre exacto del campo de relación definido en el schema ("token")[cite: 2]
          token: { 
            transaccion: { empresa_emisora: { grupo_id: usuario.grupo_id } }
          }
        },
        include: {
          // CORRECCIÓN 2: Usamos el nombre exacto de la relación hacia la tabla madre ("compensacion")[cite: 2]
          compensacion: true 
        },
        // CORRECCIÓN 3: Ajustamos el ordenamiento al nombre correcto ("compensacion")
        orderBy: { compensacion: { fecha: 'asc' } } 
      });

      let ahorroHistoricoTotal = new Prisma.Decimal(0);
      const evolucionMap = new Map<string, Prisma.Decimal>();

      detallesCompensacion.forEach(detalle => {
        const monto = new Prisma.Decimal(detalle.monto_compensado.toString());
        ahorroHistoricoTotal = ahorroHistoricoTotal.plus(monto);

        // CORRECCIÓN 4: Accedemos al objeto "compensacion" para obtener la fecha[cite: 2]
        const mesAnio = detalle.compensacion.fecha.toISOString().substring(0, 7); 
        evolucionMap.set(mesAnio, (evolucionMap.get(mesAnio) || new Prisma.Decimal(0)).plus(monto));
      });

      const evolucionAhorro = Array.from(evolucionMap.entries()).map(([mes, monto]) => ({
        mes,
        ahorro: monto.toNumber()
      }));

      const exposicionPorEmpresa = Array.from(exposicionMap.entries()).map(([empresa, neto]) => ({
        empresa,
        neto: neto.toNumber()
      }));

      // C. Oportunidades de Netting Listas
      const propuestas = await generarPropuestaNetting(usuario.grupo_id);
      const montoOportunidades = propuestas.reduce(
        (acc: Prisma.Decimal, p: any) => acc.plus(new Prisma.Decimal(p.montoACompensar.toString())), 
        new Prisma.Decimal(0)
      );

      holdingData = {
        ahorroHistorico: ahorroHistoricoTotal.toNumber(),
        oportunidadesNetting: montoOportunidades.toNumber(),
        operacionesDelMes: operacionesMes,
        graficos: {
          exposicion: exposicionPorEmpresa,
          evolucionAhorro: evolucionAhorro.length > 0 ? evolucionAhorro : [{ mes: "Actual", ahorro: 0 }]
        }
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        operacionesPendientes: countPendientes,
        tokensActivos: countTokens,
        saldos: {
          aCobrar: deudaACobrar.toNumber(),
          aPagar: deudaAPagar.toNumber(),
          saldoNeto: saldoNeto.toNumber()
        },
        holdingData
      }
    });

  } catch (error) {
    console.error("[Dashboard Controller - obtenerMetricas]", error);
    return res.status(500).json({ error: "Error interno al calcular métricas." });
  }
};