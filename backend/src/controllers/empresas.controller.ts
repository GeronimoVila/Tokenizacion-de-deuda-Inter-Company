import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';

export const obtenerEmpresasDelHolding = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) return res.status(403).json({ error: "Usuario sin grupo asignado." });

    const empresas = await prisma.empresas.findMany({
      where: { 
        grupo_id: usuario.grupo_id,
        id: { not: usuario.empresa_id },
        activa: true
      },
      select: { id: true, nombre: true, cuit: true, wallet_address: true }
    });

    return res.status(200).json({ success: true, data: empresas });
  } catch (error) {
    console.error("[Empresas Controller - obtenerEmpresasDelHolding]", error);
    return res.status(500).json({ error: "Error interno al obtener empresas." });
  }
};

export const listarTodasLasEmpresas = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) return res.status(403).json({ error: "Usuario sin grupo asignado." });

    const empresas = await prisma.empresas.findMany({
      where: { grupo_id: usuario.grupo_id },
      orderBy: { id: 'asc' }
    });

    return res.status(200).json({ success: true, data: empresas });
  } catch (error) {
    console.error("[Empresas Controller - listarTodasLasEmpresas]", error);
    return res.status(500).json({ error: "Error interno al listar empresas." });
  }
};

export const crearEmpresa = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) return res.status(403).json({ error: "Usuario sin grupo asignado." });

    const { nombre, cuit, wallet_address } = req.body;

    if (!nombre || !cuit || !wallet_address) {
      return res.status(400).json({ error: "Los campos nombre, cuit y wallet_address son obligatorios." });
    }

    const empresaExistente = await prisma.empresas.findFirst({
      where: { grupo_id: usuario.grupo_id, cuit: cuit }
    });

    if (empresaExistente) {
      return res.status(409).json({ error: "CUIT ya registrado en una empresa de este holding." });
    }

    const nuevaEmpresa = await prisma.empresas.create({
      data: {
        grupo_id: usuario.grupo_id,
        nombre,
        cuit,
        wallet_address,
        activa: true
      }
    });

    return res.status(201).json({ success: true, message: "Empresa creada con éxito.", data: nuevaEmpresa });
  } catch (error) {
    console.error("[Empresas Controller - crearEmpresa]", error);
    return res.status(500).json({ error: "Error interno al crear empresa." });
  }
};

export const editarEmpresa = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const usuario = req.usuario;
    const empresaId = parseInt(req.params.id as string);
    const { nombre, cuit, wallet_address } = req.body;

    if (!usuario?.grupo_id) return res.status(403).json({ error: "Usuario sin grupo asignado." });
    if (isNaN(empresaId)) return res.status(400).json({ error: "ID de empresa inválido." });

    const empresaDB = await prisma.empresas.findFirst({
      where: { id: empresaId, grupo_id: usuario.grupo_id }
    });

    if (!empresaDB) {
      return res.status(404).json({ error: "Empresa no encontrada o no pertenece a tu Holding." });
    }

    const empresaActualizada = await prisma.empresas.update({
      where: { id: empresaId },
      data: {
        nombre: nombre || empresaDB.nombre,
        cuit: cuit || empresaDB.cuit,
        wallet_address: wallet_address || empresaDB.wallet_address
      }
    });

    return res.status(200).json({ success: true, message: "Datos actualizados.", data: empresaActualizada });
  } catch (error) {
    console.error("[Empresas Controller - editarEmpresa]", error);
    return res.status(500).json({ error: "Error interno al editar empresa." });
  }
};

export const desactivarEmpresa = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const usuario = req.usuario;
    const empresaId = parseInt(req.params.id as string);

    if (!usuario?.grupo_id) return res.status(403).json({ error: "Usuario sin grupo asignado." });
    if (isNaN(empresaId)) return res.status(400).json({ error: "ID de empresa inválido." });

    const empresaDB = await prisma.empresas.findFirst({
      where: { id: empresaId, grupo_id: usuario.grupo_id }
    });

    if (!empresaDB) {
      return res.status(404).json({ error: "Empresa no encontrada o no pertenece a tu Holding." });
    }

    const empresaDesactivada = await prisma.empresas.update({
      where: { id: empresaId },
      data: { activa: false }
    });

    return res.status(200).json({ success: true, message: "Empresa desactivada correctamente.", data: empresaDesactivada });
  } catch (error) {
    console.error("[Empresas Controller - desactivarEmpresa]", error);
    return res.status(500).json({ error: "Error interno al desactivar empresa." });
  }
};

export const activarEmpresa = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const usuario = req.usuario;
    const empresaId = parseInt(req.params.id as string);

    if (!usuario?.grupo_id) return res.status(403).json({ error: "Usuario sin grupo asignado." });
    if (isNaN(empresaId)) return res.status(400).json({ error: "ID de empresa inválido." });

    const empresaDB = await prisma.empresas.findFirst({
      where: { id: empresaId, grupo_id: usuario.grupo_id }
    });

    if (!empresaDB) {
      return res.status(404).json({ error: "Empresa no encontrada o no pertenece a tu Holding." });
    }

    const empresaActivada = await prisma.empresas.update({
      where: { id: empresaId },
      data: { activa: true }
    });

    return res.status(200).json({ success: true, message: "Empresa reactivada correctamente.", data: empresaActivada });
  } catch (error) {
    console.error("[Empresas Controller - activarEmpresa]", error);
    return res.status(500).json({ error: "Error interno al reactivar empresa." });
  }
};