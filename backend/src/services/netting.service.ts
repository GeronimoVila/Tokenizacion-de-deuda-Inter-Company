import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';

export const generarPropuestaNetting = async (grupoId: number) => {
  const tokensActivos = await prisma.tokens_deuda.findMany({
    where: {
      estado_token: 'Activo',
      transaccion: { empresa_emisora: { grupo_id: grupoId } }
    },
    include: {
      transaccion: {
        include: { empresa_emisora: true, empresa_receptora: true }
      }
    }
  });

  const balances = new Map<string, Prisma.Decimal>();

  tokensActivos.forEach(token => {
    const deudorId = token.transaccion.empresa_emisora_id;
    const acreedorId = token.transaccion.empresa_receptora_id;
    const llave = `${deudorId}-${acreedorId}`;

    const saldoActual = balances.get(llave) || new Prisma.Decimal(0);
    balances.set(llave, saldoActual.plus(token.monto_actual));
  });

  const propuestasCompensacion = [];
  const paresProcesados = new Set<string>();

  for (const [llave, montoDeudorAAcreedor] of balances.entries()) {
    const [deudorIdStr, acreedorIdStr] = llave.split('-');
    const deudorId = parseInt(deudorIdStr);
    const acreedorId = parseInt(acreedorIdStr);

    const llaveInversa = `${acreedorId}-${deudorId}`;

    if (paresProcesados.has(llave) || paresProcesados.has(llaveInversa)) continue;

    const montoAcreedorADeudor = balances.get(llaveInversa) || new Prisma.Decimal(0);

    if (montoDeudorAAcreedor.greaterThan(0) && montoAcreedorADeudor.greaterThan(0)) {
      
      const montoCompensable = Prisma.Decimal.min(montoDeudorAAcreedor, montoAcreedorADeudor);

      propuestasCompensacion.push({
        empresaA_id: deudorId,
        empresaB_id: acreedorId,
        deudaBruta_A_hacia_B: montoDeudorAAcreedor,
        deudaBruta_B_hacia_A: montoAcreedorADeudor,
        montoACompensar: montoCompensable,
        saldoNetoFinal_A_hacia_B: montoDeudorAAcreedor.minus(montoCompensable),
        saldoNetoFinal_B_hacia_A: montoAcreedorADeudor.minus(montoCompensable),
      });
    }

    paresProcesados.add(llave);
    paresProcesados.add(llaveInversa);
  }

  return propuestasCompensacion;
};