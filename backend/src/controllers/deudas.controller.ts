import { Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';
import { ethers } from 'ethers';
import { holdingContract } from '../services/blockchain.js';
import { Prisma } from '@prisma/client';

export const registrarDeuda = async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_contraparte_id, monto, detalle } = req.body;
    const archivo = req.file;
    const usuario = req.usuario;

    if (!usuario?.empresa_id || !usuario?.grupo_id) {
      return res.status(403).json({ error: "Tu usuario no está vinculado a una empresa." });
    }

    if (!archivo) {
      return res.status(400).json({ error: "El comprobante PDF es obligatorio." });
    }

    const contraparteIdNum = parseInt(empresa_contraparte_id);

    let montoDecimal: Prisma.Decimal;
    try {
      montoDecimal = new Prisma.Decimal(monto);
    } catch (error) {
      return res.status(400).json({ error: "El formato del monto es inválido." });
    }

    if (montoDecimal.lte(0)) {
      return res.status(400).json({ error: "El monto debe ser mayor a 0." });
    }

    if (usuario.empresa_id === contraparteIdNum) return res.status(400).json({ error: "No puedes registrar deuda contigo mismo." });

    const contraparte = await prisma.empresas.findUnique({ where: { id: contraparteIdNum } });
    if (!contraparte || contraparte.grupo_id !== usuario.grupo_id) {
      return res.status(403).json({ error: "La empresa destino no existe en tu Holding." });
    }

    const formData = new FormData();
    formData.append('file', archivo.buffer, {
      filename: archivo.originalname,
      contentType: archivo.mimetype,
    });

    const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
        ...formData.getHeaders()
      }
    });

    const ipfsHash = pinataResponse.data.IpfsHash;
    const url_documento = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    const nuevaDeuda = await prisma.transacciones_deuda.create({
      data: {
        empresa_emisora_id: usuario.empresa_id, 
        empresa_receptora_id: contraparteIdNum, 
        monto: montoDecimal,
        detalle: detalle,
        url_documento_respaldo: url_documento,
        estado_validacion: 'Pendiente de Validación'
      }
    });

    res.status(201).json({ success: true, message: "Deuda e IPFS registrados.", data: nuevaDeuda });

  } catch (error) {
    console.error("🚨 [Deudas Controller] Error al registrar:", error);
    res.status(500).json({ error: "Error interno procesando la solicitud." });
  }
};

export const aprobarDeuda = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const usuario = req.usuario;

    const deuda = await prisma.transacciones_deuda.findUnique({
      where: { id: parseInt(id) },
      include: { empresa_emisora: true, empresa_receptora: true }
    });

    if (!deuda) return res.status(404).json({ error: "Deuda no encontrada." });

    if (deuda.estado_validacion !== 'Pendiente de Validación') {
      return res.status(400).json({ error: "Esta operación ya fue procesada o rechazada." });
    }
    
    if (deuda.empresa_receptora_id !== usuario.empresa_id) {
      return res.status(403).json({ error: "No tenés permisos para aprobar esta operación." });
    }

    const isLiquidacion = deuda.detalle.includes("Liquidación de Saldo");

    if (isLiquidacion) {
      console.log(`🚀 [Web3] Iniciando Quema por Liquidación Bancaria #${deuda.id}...`);

      const deudorOriginalId = deuda.empresa_receptora_id; 
      const acreedorOriginalId = deuda.empresa_emisora_id; 
      const walletAcreedor = deuda.empresa_emisora.wallet_address;

      if (!walletAcreedor) {
        return res.status(400).json({ error: "No tienes una Wallet configurada para quemar los tokens." });
      }

      const montoString = deuda.monto.toString();
      const montoParaBlockchain = ethers.parseUnits(montoString, 2);

      const tx = await holdingContract.compensarDeuda(
        walletAcreedor,
        montoParaBlockchain,
        usuario.email,
        `LIQ-${deuda.id}`
      );

      console.log(`⏳ [Web3] Transacción de quema enviada. TxHash: ${tx.hash}`);
      await tx.wait();

      const resultadoDB = await prisma.$transaction(async (txPrisma) => {
        const deudaActualizada = await txPrisma.transacciones_deuda.update({
          where: { id: deuda.id },
          data: { 
            estado_validacion: 'Liquidada', 
            fecha_validacion: new Date()
          }
        });

        const tokensActivos = await txPrisma.tokens_deuda.findMany({
          where: {
            estado_token: 'Activo',
            monto_actual: { gt: 0 },
            transaccion: {
              empresa_emisora_id: acreedorOriginalId,
              empresa_receptora_id: deudorOriginalId
            }
          },
          orderBy: { id: 'asc' }
        });

        let restante = new Prisma.Decimal(deuda.monto.toString());

        for (const token of tokensActivos) {
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
              txhash_burn: tx.hash
            }
          });

          restante = restante.minus(aDescontar);
        }

        return deudaActualizada;
      });

      console.log(`✅ [Web3 + DB] Tokens liquidados y Hash inmutable guardado.`);
      return res.status(200).json({
        success: true,
        message: "Cobro verificado y tokens remanentes quemados en la BFA.",
        data: resultadoDB
      });

    } else {
      if (!deuda.empresa_receptora.wallet_address) {
        return res.status(400).json({ error: "La empresa deudora no tiene una Wallet configurada." });
      }

      const montoString = deuda.monto.toString();
      const montoParaBlockchain = ethers.parseUnits(montoString, 2);

      const tx = await holdingContract.emitirDeuda(
        deuda.empresa_receptora.wallet_address,
        montoParaBlockchain,
        deuda.empresa_emisora.nombre,
        usuario.email,
        `ID-Transaccion-${deuda.id}`
      );

      const receipt = await tx.wait();

      const resultadoDB = await prisma.$transaction(async (txPrisma) => {
        const deudaActualizada = await txPrisma.transacciones_deuda.update({
          where: { id: deuda.id },
          data: { estado_validacion: 'Emitida', fecha_validacion: new Date() }
        });

        const nuevoToken = await txPrisma.tokens_deuda.create({
          data: {
            transaccion_id: deuda.id,
            token_id_blockchain: tx.hash,
            monto_actual: deuda.monto,
            estado_token: 'Activo',
            txhash_mint: tx.hash,
            block_number: receipt.blockNumber
          }
        });

        return { deudaActualizada, nuevoToken };
      });

      return res.status(200).json({
        success: true,
        message: "Deuda aprobada y tokenizada exitosamente en la Blockchain.",
        data: resultadoDB
      });
    }

  } catch (error: any) {
    console.error("🚨 [Aprobación Controller] Error:", error);
    res.status(500).json({ 
      error: "Error procesando la operación Web3.", 
      detalle: error.message 
    });
  }
};

export const obtenerDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const usuario = req.usuario;

    if (!usuario?.empresa_id) {
      return res.status(403).json({ error: "Tu usuario no está vinculado a una empresa." });
    }

    const empresaId = usuario.empresa_id;

    const cobrosEmitidos = await prisma.transacciones_deuda.findMany({
      where: { empresa_receptora_id: empresaId, estado_validacion: 'Emitida' },
      include: { empresa_emisora: true }
    });

    const pagosEmitidos = await prisma.transacciones_deuda.findMany({
      where: { empresa_emisora_id: empresaId, estado_validacion: 'Emitida' },
      include: { empresa_receptora: true }
    });

    const pendientes = await prisma.transacciones_deuda.findMany({
      where: {
        OR: [
          { empresa_emisora_id: empresaId },
          { empresa_receptora_id: empresaId }
        ],
        estado_validacion: 'Pendiente de Validación'
      },
      include: { empresa_emisora: true, empresa_receptora: true }
    });

    const totalTokensAFavor = cobrosEmitidos.reduce(
      (acc, curr) => acc.plus(new Prisma.Decimal(curr.monto.toString())), 
      new Prisma.Decimal(0)
    );
    const totalDeudasAPagar = pagosEmitidos.reduce(
      (acc, curr) => acc.plus(new Prisma.Decimal(curr.monto.toString())), 
      new Prisma.Decimal(0)
    );
    const saldoNeto = totalTokensAFavor.minus(totalDeudasAPagar);

    res.status(200).json({
      success: true,
      message: "Dashboard financiero calculado con éxito.",
      data: {
        balances: {
          total_tokens_a_favor: totalTokensAFavor.toNumber(),
          total_deudas_a_pagar: totalDeudasAPagar.toNumber(),
          saldo_neto_empresa: saldoNeto.toNumber()
        },
        listados: {
          mis_tokens_por_cobrar: cobrosEmitidos,
          mis_deudas_por_pagar: pagosEmitidos,
          tramites_pendientes: pendientes
        }
      }
    });

  } catch (error) {
    console.error("🚨 [Deudas Controller] Error al obtener dashboard:", error);
    res.status(500).json({ error: "Error interno obteniendo los datos de la empresa." });
  }
};

export const rechazarDeuda = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const usuario = req.usuario;

    const deuda = await prisma.transacciones_deuda.findUnique({
      where: { id: parseInt(id) }
    });

    if (!deuda) return res.status(404).json({ error: "Deuda no encontrada." });

    if (deuda.estado_validacion !== 'Pendiente de Validación') {
      return res.status(400).json({ error: "Esta operación ya fue procesada o rechazada previamente." });
    }
    
    if (deuda.empresa_receptora_id !== usuario.empresa_id) {
      return res.status(403).json({ error: "No tenés permisos para rechazar esta operación." });
    }

    const deudaRechazada = await prisma.transacciones_deuda.update({
      where: { id: deuda.id },
      data: { 
        estado_validacion: 'Rechazada',
        fecha_validacion: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: "La operación ha sido rechazada exitosamente.",
      data: deudaRechazada
    });

  } catch (error: any) {
    console.error("🚨 [Deudas Controller] Error al rechazar:", error);
    res.status(500).json({ error: "Error procesando el rechazo de la operación." });
  }
};

export const obtenerDeudasPendientes = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) {
      return res.status(403).json({ error: "Usuario sin grupo asignado." });
    }

    const isGlobal = [1, 2, 5].includes(usuario.rol_id);
    const empId = usuario.empresa_id;

    const whereClause: any = {
      estado_validacion: 'Pendiente de Validación', 
      empresa_emisora: { grupo_id: usuario.grupo_id }
    };

    if (!isGlobal && empId) {
      whereClause.empresa_receptora_id = empId;
    }

    const alertas = await prisma.transacciones_deuda.findMany({
      where: whereClause,
      select: {
        id: true,
        monto: true,
        detalle: true,
        fecha_creacion: true,
        empresa_emisora: {
          select: { nombre: true }
        }
      },
      orderBy: { fecha_creacion: 'desc' }
    });

    return res.status(200).json({ success: true, data: alertas });

  } catch (error) {
    console.error("[Deudas Controller - obtenerDeudasPendientes]", error);
    return res.status(500).json({ error: "Error interno al obtener las alertas pendientes." });
  }
};