import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { generarPropuestaNetting } from '../services/netting.service.js';
import { ethers } from 'ethers';
import { holdingContract } from '../services/blockchain.js';
import { prisma } from '../config/prisma.js';

export const simularNetting = async (req: AuthRequest, res: Response) => {
  try {
    const usuario = req.usuario;

    if (!usuario?.grupo_id) {
      return res.status(403).json({ error: "No pertenecés a un Holding válido." });
    }

    console.log(`🧮 [Motor Netting] Calculando compensaciones para el Holding #${usuario.grupo_id}...`);
    
    const propuesta = await generarPropuestaNetting(usuario.grupo_id);

    if (propuesta.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No hay deudas cruzadas para compensar en este momento.",
        data: []
      });
    }

    res.status(200).json({
      success: true,
      message: "Propuesta de compensación generada con éxito.",
      data: propuesta
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

    const idCompensacionMensual = `COMP-${compensacionDB.id}`;
    const resultados = [];

    for (const prop of propuesta) {
      const { empresaA_id, empresaB_id, montoACompensar } = prop;

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
        idCompensacionMensual
      );
      await tx1.wait();

      console.log(`⏳ Quemando tokens de la Wallet de ${empresaB.nombre}...`);
      const tx2 = await holdingContract.compensarDeuda(
        empresaB.wallet_address,
        montoParaBlockchain,
        usuario.email,
        idCompensacionMensual
      );
      await tx2.wait();

      resultados.push({
        par_compensado: `${empresaA.nombre} <-> ${empresaB.nombre}`,
        monto_destruido: montoACompensar,
        txHash_Quema_A: tx1.hash,
        txHash_Quema_B: tx2.hash
      });
    }

    console.log(`✅ [Web3] Netting completado. Tokens destruidos exitosamente.`);

    res.status(200).json({
      success: true,
      message: "Proceso de Netting ejecutado y sellado en la Blockchain.",
      data: {
        id_operacion: idCompensacionMensual,
        detalles: resultados
      }
    });

  } catch (error: any) {
    console.error("🚨 [Netting Controller] Error Web3:", error);
    res.status(500).json({ error: "Error ejecutando el Netting.", detalle: error.message });
  }
};