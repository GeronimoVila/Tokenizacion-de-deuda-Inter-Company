import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';

export const preRegistrarUsuario = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const admin = req.usuario;
    
    if (!admin?.grupo_id) {
      return res.status(403).json({ error: "Acceso denegado. No perteneces a un Holding." });
    }

    const { nombre, email, empresa_id, rol_id } = req.body;

    if (!nombre || !email || !rol_id) {
      return res.status(400).json({ error: "Los campos nombre, email y rol_id son obligatorios." });
    }

    const emailLower = email.toLowerCase();

    const usuarioExistente = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (usuarioExistente) {
      return res.status(409).json({ error: "El correo electrónico ya está registrado." });
    }

    const idRol = parseInt(rol_id);
    let idEmpresa = empresa_id ? parseInt(empresa_id) : null;

    if (idRol <= admin.rol_id) {
      return res.status(403).json({ 
        error: "No tienes permisos para asignar un rol igual o con mayores privilegios que el tuyo." 
      });
    }

    if (admin.rol_id === 3) {
      idEmpresa = admin.empresa_id;
    }

    if (idRol >= 3 && !idEmpresa) {
      return res.status(400).json({ error: "Para este nivel de acceso, es obligatorio seleccionar una Empresa Subsidiaria." });
    }

    if (idEmpresa) {
      const empresaDB = await prisma.empresas.findFirst({
        where: { id: idEmpresa, grupo_id: admin.grupo_id }
      });

      if (!empresaDB) {
        return res.status(404).json({ error: "La empresa seleccionada no existe o no pertenece a tu grupo empresarial." });
      }
    }

    const nuevoUsuario = await prisma.user.create({
      data: {
        name: nombre,
        email: emailLower,
        rol_id: idRol,
        grupo_id: admin.grupo_id,
        empresa_id: idEmpresa,
      }
    });

    return res.status(201).json({ 
      success: true, 
      message: "Usuario pre-registrado exitosamente.", 
      data: nuevoUsuario 
    });

  } catch (error) {
    console.error("[Usuarios Controller - preRegistrarUsuario]", error);
    return res.status(500).json({ error: "Error interno al pre-registrar usuario." });
  }
};

export const obtenerUsuarios = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const admin = req.usuario;
    if (!admin?.grupo_id) return res.status(403).json({ error: "No perteneces a un Holding." });

    let whereClause: any = { grupo_id: admin.grupo_id };

    if (admin.rol_id === 3) {
      whereClause.empresa_id = admin.empresa_id;
    }

    const usuarios = await prisma.user.findMany({
      where: whereClause,
      include: {
        rol: { select: { nombre: true } },
        empresa: { select: { nombre: true } }
      },
      orderBy: { id: 'desc' }
    });

    return res.status(200).json({ success: true, data: usuarios });
  } catch (error) {
    console.error("[Usuarios Controller - obtenerUsuarios]", error);
    return res.status(500).json({ error: "Error interno al obtener usuarios." });
  }
};