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
  { title: "Cargar Deuda", href: "/cargar-deuda", roles: [3, 4], requiresActiveCompany: true },
  { title: "Aprobación Dual", href: "/aprobaciones", roles: [3, 4], requiresActiveCompany: true },
  { title: "Correcciones", href: "/correcciones", roles: [3, 4], requiresActiveCompany: true },
  { title: "Liquidación Pendiente", href: "/liquidar-deuda", roles: [3], requiresActiveCompany: true },
  { title: "Compensación (Netting)", href: "/netting", roles: [2], requiresActiveCompany: true },
  { title: "Auditoría Web3", href: "/dashboard/auditoria", roles: [2, 3, 4, 5] },
  { title: "Auditoría Netting", href: "/dashboard/auditoria/netting", roles: [2, 3, 4, 5] },
];

export const configItems = [
  { title: "Perfil Corporativo", href: "/dashboard/configuracion/perfil", roles: [2, 3] },
  { title: "Empresas Subsidiarias", href: "/dashboard/configuracion/empresas", roles: [2] },
  { title: "Gestión de Usuarios", href: "/dashboard/configuracion/usuarios", roles: [2, 3] }
];