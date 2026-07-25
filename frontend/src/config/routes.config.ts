export const ROLES = {
  SYSADMIN: 1,
  ADMIN_HOLDING: 2,
  ADMIN_SUBSIDIARIA: 3,
  OPERADOR: 4,
  AUDITOR: 5,
} as const;

export const menuItems = [
  { title: "Inicio (Dashboard)", href: "/dashboard", roles: [1, 2, 3, 4, 5] },
  { title: "Panel Sysadmin", href: "/admin-core", roles: [1] },
  { title: "Cargar Deuda", href: "/cargar-deuda", roles: [3, 4] },
  { title: "Aprobación Dual", href: "/aprobaciones", roles: [3, 4] },
  { title: "Liquidación Pendiente", href: "/liquidar-deuda", roles: [3] },
  { title: "Compensación (Netting)", href: "/netting", roles: [2] },
  { title: "Auditoría Web3", href: "/dashboard/auditoria", roles: [2, 3, 4, 5] },
];

export const configItems = [
  { title: "Empresas Subsidiarias", href: "/dashboard/configuracion/empresas", roles: [2] },
  { title: "Gestión de Usuarios", href: "/dashboard/configuracion/usuarios", roles: [2, 3] }
];