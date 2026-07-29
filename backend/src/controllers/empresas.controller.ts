import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';


const ROLES = {
  SYSADMIN: 1,
  ADMIN_HOLDING: 2,
  ADMIN_SUBSIDIARIA: 3,
  OPERADOR: 4,
  AUDITOR: 5,
} as const;

/**
 * @route GET /api/empresas/todas
 * @desc Retorna las subsidiarias del holding. Si el usuario es Admin del Holding, ve todas.
 * Si es Admin de Subsidiaria, Operador o Auditor, ve todas EXCEPTO la suya propia.
 */
export const obtenerEmpresasDelHolding = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) {
      res.status(403).json({ error: "Usuario sin grupo asignado." });
      return;
    }
    
    const filtroExclusion = usuario.empresa_id ? { not: usuario.empresa_id } : undefined;

    const empresas = await prisma.empresas.findMany({
      where: { 
        grupo_id: usuario.grupo_id,
        ...(filtroExclusion && { id: filtroExclusion }),
        activa: true
      },
      select: { id: true, nombre: true, cuit: true, wallet_address: true },
      orderBy: { nombre: 'asc' }
    });

    res.status(200).json({ success: true, data: empresas });
  } catch (error) {
    console.error("[Empresas Controller - obtenerEmpresasDelHolding]", error);
    res.status(500).json({ error: "Error interno al obtener empresas operativas." });
  }
};

/**
 * @desc Retorna TODO el directorio de subsidiarias activas del holding.
 * Ideal para el RF-07 (Auditoría Web3) para los filtros del menú desplegable.
 */
export const listarTodasLasEmpresas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) {
      res.status(403).json({ error: "Usuario sin grupo asignado." });
      return;
    }

    // Definimos qué roles deben ser filtrados para excluir su propia subsidiaria
    const rolesFiltrados: number[] = [
      ROLES.ADMIN_SUBSIDIARIA, 
      ROLES.OPERADOR, 
      ROLES.AUDITOR
    ];

    // Si el usuario pertenece a uno de los roles filtrados y tiene una empresa asignada, 
    // excluimos su propio ID de la lista desplegable.
    const debeExcluirSuEmpresa = usuario.rol_id && rolesFiltrados.includes(usuario.rol_id);
    const filtroExclusion = (debeExcluirSuEmpresa && usuario.empresa_id) 
      ? { not: usuario.empresa_id } 
      : undefined;

    const empresas = await prisma.empresas.findMany({
      where: { 
        grupo_id: usuario.grupo_id,
        activa: true, // Solo empresas operativas
        ...(filtroExclusion && { id: filtroExclusion })
      },
      select: { 
        id: true, 
        nombre: true, 
        cuit: true, 
        wallet_address: true 
      },
      orderBy: { 
        nombre: 'asc' 
      }
    });

    res.status(200).json({ success: true, data: empresas });
  } catch (error) {
    console.error("[Empresas Controller - listarTodasLasEmpresas]", error);
    res.status(500).json({ error: "Error interno al listar empresas." });
  }
};

export const crearEmpresa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    if (!usuario?.grupo_id) {
      res.status(403).json({ error: "Usuario sin grupo asignado." });
      return;
    }

    const { nombre, cuit, wallet_address } = req.body;

    if (!nombre || !cuit || !wallet_address) {
      res.status(400).json({ error: "Los campos nombre, cuit y wallet_address son obligatorios." });
      return;
    }

    const empresaExistente = await prisma.empresas.findFirst({
      where: { grupo_id: usuario.grupo_id, cuit: cuit }
    });

    if (empresaExistente) {
      res.status(409).json({ error: "CUIT ya registrado en una empresa de este holding." });
      return;
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

    res.status(201).json({ success: true, message: "Empresa creada con éxito.", data: nuevaEmpresa });
  } catch (error) {
    console.error("[Empresas Controller - crearEmpresa]", error);
    res.status(500).json({ error: "Error interno al crear empresa." });
  }
};

export const editarEmpresa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    const empresaId = parseInt(req.params.id as string);
    const { nombre, cuit, wallet_address } = req.body;

    if (!usuario?.grupo_id) {
      res.status(403).json({ error: "Usuario sin grupo asignado." });
      return;
    }
    if (isNaN(empresaId)) {
      res.status(400).json({ error: "ID de empresa inválido." });
      return;
    }

    const empresaDB = await prisma.empresas.findFirst({
      where: { id: empresaId, grupo_id: usuario.grupo_id }
    });

    if (!empresaDB) {
      res.status(404).json({ error: "Empresa no encontrada o no pertenece a tu Holding." });
      return;
    }

    const empresaActualizada = await prisma.empresas.update({
      where: { id: empresaId },
      data: {
        nombre: nombre || empresaDB.nombre,
        cuit: cuit || empresaDB.cuit,
        wallet_address: wallet_address || empresaDB.wallet_address
      }
    });

    res.status(200).json({ success: true, message: "Datos actualizados.", data: empresaActualizada });
  } catch (error) {
    console.error("[Empresas Controller - editarEmpresa]", error);
    res.status(500).json({ error: "Error interno al editar empresa." });
  }
};

export const desactivarEmpresa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    const empresaId = parseInt(req.params.id as string);

    if (!usuario?.grupo_id) {
      res.status(403).json({ error: "Usuario sin grupo asignado." });
      return;
    }
    if (isNaN(empresaId)) {
      res.status(400).json({ error: "ID de empresa inválido." });
      return;
    }

    const empresaDB = await prisma.empresas.findFirst({
      where: { id: empresaId, grupo_id: usuario.grupo_id }
    });

    if (!empresaDB) {
      res.status(404).json({ error: "Empresa no encontrada o no pertenece a tu Holding." });
      return;
    }

    const empresaDesactivada = await prisma.empresas.update({
      where: { id: empresaId },
      data: { activa: false }
    });

    res.status(200).json({ success: true, message: "Empresa desactivada correctamente.", data: empresaDesactivada });
  } catch (error) {
    console.error("[Empresas Controller - desactivarEmpresa]", error);
    res.status(500).json({ error: "Error interno al desactivar empresa." });
  }
};

export const activarEmpresa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    const empresaId = parseInt(req.params.id as string);

    if (!usuario?.grupo_id) {
      res.status(403).json({ error: "Usuario sin grupo asignado." });
      return;
    }
    if (isNaN(empresaId)) {
      res.status(400).json({ error: "ID de empresa inválido." });
      return;
    }

    const empresaDB = await prisma.empresas.findFirst({
      where: { id: empresaId, grupo_id: usuario.grupo_id }
    });

    if (!empresaDB) {
      res.status(404).json({ error: "Empresa no encontrada o no pertenece a tu Holding." });
      return;
    }

    const empresaActivada = await prisma.empresas.update({
      where: { id: empresaId },
      data: { activa: true }
    });

    res.status(200).json({ success: true, message: "Empresa reactivada correctamente.", data: empresaActivada });
  } catch (error) {
    console.error("[Empresas Controller - activarEmpresa]", error);
    res.status(500).json({ error: "Error interno al reactivar empresa." });
  }
};