import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';
import { ethers } from 'ethers';
import { holdingContract } from '../services/blockchain.js';

export const registrarDeuda = async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_contraparte_id, monto, detalle, url_documento_respaldo } = req.body;
    const usuario = req.usuario;

    if (!usuario?.empresa_id || !usuario?.grupo_id) {
      return res.status(403).json({ error: "Tu usuario no está vinculado a una empresa del Holding." });
    }

    if (!monto || monto <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a 0." });
    }
    if (usuario.empresa_id === empresa_contraparte_id) {
      return res.status(400).json({ error: "Operación inválida: Una empresa no puede registrar deuda consigo misma." });
    }

    const contraparte = await prisma.empresas.findUnique({
      where: { id: empresa_contraparte_id }
    });

    if (!contraparte || contraparte.grupo_id !== usuario.grupo_id) {
      return res.status(403).json({ error: "La empresa destino no existe o no pertenece a tu Holding." });
    }

    const nuevaDeuda = await prisma.transacciones_deuda.create({
      data: {
        empresa_emisora_id: empresa_contraparte_id,
        empresa_receptora_id: usuario.empresa_id,
        monto: monto,
        detalle: detalle,
        url_documento_respaldo: url_documento_respaldo,
        estado_validacion: 'Pendiente de Validación'
      }
    });

    res.status(201).json({
      success: true,
      message: "Factura registrada. Pendiente de aprobación por la contraparte.",
      data: nuevaDeuda
    });

  } catch (error) {
    console.error("🚨 [Deudas Controller] Error al registrar:", error);
    res.status(500).json({ error: "Error interno procesando la solicitud." });
  }
};

export const aprobarDeuda = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const usuario = req.usuario;

    // 1. BUSCAMOS LA DEUDA ORIGINAL
    const deuda = await prisma.transacciones_deuda.findUnique({
      where: { id: parseInt(id) },
      include: { empresa_emisora: true, empresa_receptora: true }
    });

    if (!deuda) return res.status(404).json({ error: "Deuda no encontrada." });

    // 2. VALIDACIONES DE NEGOCIO Y SEGURIDAD
    if (deuda.estado_validacion !== 'Pendiente de Validación') {
      return res.status(400).json({ error: "Esta deuda ya fue procesada o rechazada." });
    }
    
    // Regla B2B Core: Solo la empresa a la que le están cobrando (Emisora) puede aprobar la deuda.
    if (deuda.empresa_emisora_id !== usuario.empresa_id) {
      return res.status(403).json({ error: "No tenés permisos para aprobar facturas a nombre de otra empresa." });
    }

    // Asegurarnos que la contraparte tiene una Billetera (Wallet) configurada para recibir los tokens
    if (!deuda.empresa_receptora.wallet_address) {
      return res.status(400).json({ error: "La empresa acreedora no tiene una Wallet configurada para recibir los tokens." });
    }

    console.log(`🚀 [Web3] Iniciando acuñación de deuda #${deuda.id} hacia BFA...`);

    // 3. ADAPTAR MONTOS A LA BLOCKCHAIN
    // Convertimos el monto de Prisma (Decimal) a string, y luego le decimos a ethers que lo formatee con los 2 decimales que configuramos en Solidity.
    const montoString = deuda.monto.toString();
    const montoParaBlockchain = ethers.parseUnits(montoString, 2);

    // 4. INTERACCIÓN CON EL SMART CONTRACT (La magia ocurre acá)
    const tx = await holdingContract.emitirDeuda(
      deuda.empresa_receptora.wallet_address, // cuentaDestino
      montoParaBlockchain,                    // cantidad en centavos
      deuda.empresa_emisora.nombre,           // empresaOrigenNombre
      usuario.email,                          // usuarioOperadorId (Auditoría)
      `ID-Transaccion-${deuda.id}`            // comprobanteId
    );

    // Ponemos en pausa nuestro Backend hasta que los mineros del mundo confirmen el bloque
    console.log(`⏳ [Web3] Transacción enviada. Esperando minado... TxHash: ${tx.hash}`);
    const receipt = await tx.wait();

    // 5. TRANSACCIÓN EN BASE DE DATOS LOCAL (Atómico)
    // Llegamos acá solo si la blockchain aprobó todo sin errores.
    const resultadoDB = await prisma.$transaction(async (txPrisma) => {
      // A) Marcamos la deuda como Emitida
      const deudaActualizada = await txPrisma.transacciones_deuda.update({
        where: { id: deuda.id },
        data: { 
          estado_validacion: 'Emitida',
          fecha_validacion: new Date()
        }
      });

      // B) Registramos el Token Físico en nuestra tabla
      const nuevoToken = await txPrisma.tokens_deuda.create({
        data: {
          transaccion_id: deuda.id,
          token_id_blockchain: tx.hash,   // Usamos el hash como identificador único
          monto_actual: deuda.monto,
          estado_token: 'Activo',
          txhash_mint: tx.hash,
          block_number: receipt.blockNumber
        }
      });

      return { deudaActualizada, nuevoToken };
    });

    console.log(`✅ [Web3 + DB] Éxito absoluto. Deuda tokenizada.`);
    
    res.status(200).json({
      success: true,
      message: "Deuda aprobada y tokenizada exitosamente en la Blockchain.",
      data: resultadoDB
    });

  } catch (error: any) {
    console.error("🚨 [Aprobación Controller] Error:", error);
    // Si ethers.js tira error por falta de gas o caída de red, la base de datos local nunca se tocó.
    res.status(500).json({ 
      error: "Error procesando la aprobación Web3.", 
      detalle: error.message 
    });
  }
};