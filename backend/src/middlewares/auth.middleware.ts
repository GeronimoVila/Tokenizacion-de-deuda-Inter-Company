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
  holding_activo?: boolean;
}

export interface AuthRequest extends Request {
  usuario?: UsuarioPayload; 
}

/**
 * Middleware de Autenticación y Autorización (RBAC)
 * @param rolesPermitidos
 */
export const requerirRol = (rolesPermitidos: number[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userEmail = req.header('x-user-email');

      if (!userEmail) {
        res.status(401).json({ error: "No autorizado. Falta identificar al usuario." });
        return;
      }

      const usuarioDB = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { rol: true, empresa: true, grupo: true }
      });

      if (!usuarioDB || !usuarioDB.rol_id) {
        res.status(403).json({ error: "Acceso denegado. Usuario no registrado o sin rol asignado." });
        return;
      }

      if (!rolesPermitidos.includes(usuarioDB.rol_id)) {
        console.warn(`🚨 Intento de acceso bloqueado: ${usuarioDB.email} intentó acceder a una ruta protegida.`);
        res.status(403).json({ 
          error: `Acceso denegado. Se requiere nivel de seguridad superior. Tu rol actual es: ${usuarioDB.rol?.nombre}` 
        });
        return;
      }

      const isHoldingInactivo = usuarioDB.grupo && usuarioDB.grupo.activo === false;
      const isEmpresaInactiva = usuarioDB.empresa && usuarioDB.empresa.activa === false;

      if (isHoldingInactivo || isEmpresaInactiva) {
        if (req.method !== 'GET') {
          const entidadInactiva = isHoldingInactivo ? 'El Grupo Empresarial (Holding)' : 'Su Empresa Subsidiaria';
          console.warn(`🔒 Bloqueo aplicado: ${usuarioDB.email} intentó escribir en sistema con ${entidadInactiva} suspendido.`);
          
          res.status(403).json({ 
            error: `${entidadInactiva} se encuentra suspendido. Su cuenta ha sido limitada temporalmente a 'Modo de Auditoría'.` 
          });
          return;
        }
      }

      req.usuario = {
        id: usuarioDB.id,
        email: usuarioDB.email ?? userEmail, 
        rol_id: usuarioDB.rol_id,
        grupo_id: usuarioDB.grupo_id,
        empresa_id: usuarioDB.empresa_id,
        empresa_activa: usuarioDB.empresa?.activa ?? true,
        holding_activo: usuarioDB.grupo?.activo ?? true
      };

      next();

    } catch (error) {
      console.error("[Auth Middleware] Error:", error);
      res.status(500).json({ error: "Error interno verificando credenciales" });
    }
  };
};