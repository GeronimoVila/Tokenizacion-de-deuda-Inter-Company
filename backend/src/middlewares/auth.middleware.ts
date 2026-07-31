import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

export const ROLES = {
  SYSADMIN: 1,
  ADMIN_HOLDING: 2,
  ADMIN_SUBSIDIARIA: 3,
  OPERADOR: 4,
  AUDITOR: 5,
};

export interface UsuarioPayload {
  id: number;
  email: string;
  rol_id: number;
  grupo_id: number | null;
  empresa_id: number | null;
  empresa_activa?: boolean;
}

export interface AuthRequest extends Request {
  usuario?: UsuarioPayload; 
}

/**
 * Middleware de Autenticación y Autorización (RBAC)
 * @param rolesPermitidos
 */
export const requerirRol = (rolesPermitidos: number[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const headerEmail = req.headers['x-user-email'];

      if (!headerEmail || typeof headerEmail !== 'string') {
        return res.status(401).json({ error: "No autorizado. Falta identificar al usuario." });
      }

      const userEmail: string = headerEmail;

      const usuarioDB = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { rol: true, empresa: true, grupo: true }
      });

      if (!usuarioDB || !usuarioDB.rol_id) {
        return res.status(403).json({ error: "Acceso denegado. Usuario no registrado o sin rol asignado." });
      }

      if (!rolesPermitidos.includes(usuarioDB.rol_id)) {
        console.warn(`🚨 Intento de acceso bloqueado: ${usuarioDB.email} intentó acceder a una ruta protegida.`);
        return res.status(403).json({ 
          error: `Acceso denegado. Se requiere nivel de seguridad superior. Tu rol actual es: ${usuarioDB.rol?.nombre}` 
        });
      }

      req.usuario = {
        id: usuarioDB.id,
        email: usuarioDB.email ?? userEmail, 
        rol_id: usuarioDB.rol_id,
        grupo_id: usuarioDB.grupo_id,
        empresa_id: usuarioDB.empresa_id,
        empresa_activa: usuarioDB.empresa?.activa ?? true
      };

      next();

    } catch (error) {
      console.error("[Auth Middleware] Error:", error);
      return res.status(500).json({ error: "Error interno verificando credenciales" });
    }
  };
};