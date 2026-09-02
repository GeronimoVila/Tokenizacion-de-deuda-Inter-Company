import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js'; 

export interface SubsidiaryBurnMetric {
  empresaId: number;
  nombreEmpresa: string;
  totalQuemado: string; 
}

export class MetricsService {
  public async getHoldingBurnMetrics(grupoId: number): Promise<SubsidiaryBurnMetric[]> {
    const compensaciones = await prisma.compensacion_Detalle.findMany({
      where: {
        token: {
          transaccion: {
            empresa_emisora: {
              grupo_id: grupoId, 
            },
          },
        },
      },
      include: {
        token: {
          include: {
            transaccion: {
              include: {
                empresa_emisora: true, 
              },
            },
          },
        },
      },
    });

    const burnMap = new Map<number, { nombre: string; total: Prisma.Decimal }>();

    for (const detalle of compensaciones) {
      const empresa = detalle.token.transaccion.empresa_emisora;
      const montoKilled = new Prisma.Decimal(detalle.monto_compensado);

      if (burnMap.has(empresa.id)) {
        const current = burnMap.get(empresa.id)!;
        current.total = current.total.plus(montoKilled);
      } else {
        burnMap.set(empresa.id, {
          nombre: empresa.nombre,
          total: montoKilled,
        });
      }
    }

    return Array.from(burnMap.values()).map((data, index) => ({
      empresaId: Array.from(burnMap.keys())[index],
      nombreEmpresa: data.nombre,
      totalQuemado: data.total.toFixed(2), 
    }));
  }

  public async getSystemTotalBurned(): Promise<string> {
    const allCompensaciones = await prisma.compensacion_Detalle.findMany({
      select: { monto_compensado: true },
    });

    const totalSystem = allCompensaciones.reduce(
      (acc, curr) => acc.plus(new Prisma.Decimal(curr.monto_compensado)),
      new Prisma.Decimal(0)
    );

    return totalSystem.toFixed(2);
  }
}