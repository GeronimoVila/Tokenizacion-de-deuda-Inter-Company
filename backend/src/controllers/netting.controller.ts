import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { generarPropuestaNetting } from '../services/netting.service.js';
import { ethers } from 'ethers';
import { holdingContract } from '../services/blockchain.js';
import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';

export const simularNetting = async (req: AuthRequest, res: Response) => {
  try {
    const usuario = req.usuario;

    if (!usuario?.grupo_id) {
      return res.status(403).json({ error: "No pertenecés a un Holding válido." });
    }

    console.log(`🧮 [Motor Netting] Calculando compensaciones y saldos para el Holding #${usuario.grupo_id}...`);
    
    let propuesta = await generarPropuestaNetting(usuario.grupo_id);
    
    if (usuario.rol_id === 3) {
      propuesta = propuesta.filter(p => 
        p.empresaA_id === usuario.empresa_id || p.empresaB_id === usuario.empresa_id
      );
    }

    const propuestaConNombres = await Promise.all(
      propuesta.map(async (p) => {
        const empA = await prisma.empresas.findUnique({ where: { id: p.empresaA_id } });
        const empB = await prisma.empresas.findUnique({ where: { id: p.empresaB_id } });
        
        return {
          ...p,
          empresaA: { id: empA?.id, nombre: empA?.nombre },
          empresaB: { id: empB?.id, nombre: empB?.nombre },
          deudasA_B: p.deudasA_B,
          deudasB_A: p.deudasB_A
        };
      })
    );

    let tokensActivos = await prisma.tokens_deuda.findMany({
      where: {
        estado_token: 'Activo',
        transaccion: { empresa_emisora: { grupo_id: usuario.grupo_id } }
      },
      include: {
        transaccion: {
          include: { empresa_emisora: true, empresa_receptora: true }
        }
      }
    });

    if (usuario.rol_id === 3) {
      tokensActivos = tokensActivos.filter(token => 
        token.transaccion.empresa_emisora_id === usuario.empresa_id || 
        token.transaccion.empresa_receptora_id === usuario.empresa_id
      );
    }

    const saldosMap = new Map<string, any>();
    
    tokensActivos.forEach(token => {
      const deudor = token.transaccion.empresa_emisora.nombre;
      const acreedor = token.transaccion.empresa_receptora.nombre;
      const deudor_id = token.transaccion.empresa_emisora_id;
      const acreedor_id = token.transaccion.empresa_receptora_id;
      const llave = `${deudor_id}-${acreedor_id}`;

      if (!saldosMap.has(llave)) {
        saldosMap.set(llave, { 
          deudor_id,
          acreedor_id,
          deudor, 
          acreedor, 
          monto_total: new Prisma.Decimal(0), 
          cantidad_tokens: 0 
        });
      }

      const saldo = saldosMap.get(llave);
      saldo.monto_total = saldo.monto_total.plus(new Prisma.Decimal(token.monto_actual.toString()));
      saldo.cantidad_tokens += 1;
    });

    const saldosGlobales = Array.from(saldosMap.values()).map(s => ({
      deudor_id: s.deudor_id,
      acreedor_id: s.acreedor_id,
      deudor: s.deudor,
      acreedor: s.acreedor,
      monto_total: s.monto_total.toNumber(),
      cantidad_tokens: s.cantidad_tokens
    }));

    res.status(200).json({
      success: true,
      message: "Datos financieros calculados con éxito.",
      data: {
        oportunidades: propuestaConNombres,
        saldos_activos: saldosGlobales
      }
    });

  } catch (error) {
    console.error("🚨 [Netting Controller] Error:", error);
    res.status(500).json({ error: "Error interno calculando el Netting." });
  }
};

export const ejecutarNetting = async (req: AuthRequest, res: Response) => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) return res.status(403).json({ error: "No pertenecés a un Holding válido." });

    const propuesta = await generarPropuestaNetting(usuario.grupo_id);
    if (propuesta.length === 0) {
      return res.status(400).json({ error: "No hay deudas para compensar." });
    }

    console.log(`🚀 [Web3] Iniciando Quema de Tokens (Netting) para Holding #${usuario.grupo_id}...`);

    const compensacionDB = await prisma.compensaciones.create({
      data: {
        usuario_ejecutor_id: usuario.id,
        descripcion: `Netting mensual ejecutado por ${usuario.email}`,
      }
    });

    const resultados = [];

    for (const prop of propuesta) {
      const { empresaA_id, empresaB_id, montoACompensar, deudasA_B, deudasB_A } = prop;

      const empresaA = await prisma.empresas.findUnique({ where: { id: empresaA_id } });
      const empresaB = await prisma.empresas.findUnique({ where: { id: empresaB_id } });

      if (!empresaA?.wallet_address || !empresaB?.wallet_address) {
         throw new Error(`Una de las empresas no tiene billetera Web3 configurada.`);
      }

      const montoParaBlockchain = ethers.parseUnits(montoACompensar.toString(), 2);

      console.log(`⏳ Quemando tokens de la Wallet de ${empresaA.nombre}...`);
      const tx1 = await holdingContract.compensarDeuda(
        empresaA.wallet_address,
        montoParaBlockchain,
        usuario.email,
        `COMP-${compensacionDB.id}`
      );
      await tx1.wait();

      console.log(`⏳ Quemando tokens de la Wallet de ${empresaB.nombre}...`);
      const tx2 = await holdingContract.compensarDeuda(
        empresaB.wallet_address,
        montoParaBlockchain,
        usuario.email,
        `COMP-${compensacionDB.id}`
      );
      await tx2.wait();

      await prisma.$transaction(async (txPrisma) => {

        const aplicarDescuento = async (tokens: any[], hashQuema: string) => {
          let restante = new Prisma.Decimal(montoACompensar.toString());

          for (const token of tokens) {
            if (restante.lte(0)) break;

            const montoToken = new Prisma.Decimal(token.monto_actual.toString());
            const aDescontar = Prisma.Decimal.min(montoToken, restante);
            const nuevoMonto = montoToken.minus(aDescontar);
            
            const nuevoEstado = nuevoMonto.equals(0) ? 'Quemado' : 'Activo';

            await txPrisma.tokens_deuda.update({
              where: { id: token.id },
              data: {
                monto_actual: nuevoMonto,
                estado_token: nuevoEstado,
                txhash_burn: hashQuema
              }
            });

            await txPrisma.compensacion_Detalle.create({
              data: {
                compensacion_id: compensacionDB.id,
                token_id: token.id,
                monto_compensado: aDescontar
              }
            });

            restante = restante.minus(aDescontar);
          }
        };

        await aplicarDescuento(deudasA_B, tx1.hash);
        await aplicarDescuento(deudasB_A, tx2.hash);
      });

      resultados.push({
        par_compensado: `${empresaA.nombre} <-> ${empresaB.nombre}`,
        monto_destruido: montoACompensar,
        txHash_Quema_A: tx1.hash,
        txHash_Quema_B: tx2.hash
      });
    }

    console.log(`✅ [Web3 + DB] Netting completado. Tokens destruidos y DB sincronizada.`);

    res.status(200).json({
      success: true,
      message: "Proceso de Netting ejecutado y sellado en la Blockchain.",
      data: {
        id_operacion: `COMP-${compensacionDB.id}`,
        detalles: resultados
      }
    });

  } catch (error: any) {
    console.error("🚨 [Netting Controller] Error Web3/DB:", error);
    res.status(500).json({ error: "Error ejecutando el Netting.", detalle: error.message });
  }
};