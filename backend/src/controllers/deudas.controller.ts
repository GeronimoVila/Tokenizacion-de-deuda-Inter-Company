import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';

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