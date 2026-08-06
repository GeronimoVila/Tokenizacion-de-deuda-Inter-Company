import { LayoutDashboard, Settings, FilePlus2, CheckSquare, FileEdit, Clock, ArrowRightLeft, Search, Network, Building, Briefcase, Users } from "lucide-react";

export const ROLES = {
  SYSADMIN: 1,
  ADMIN_HOLDING: 2,
  ADMIN_SUBSIDIARIA: 3,
  OPERADOR: 4,
  AUDITOR: 5,
} as const;

export const menuItems = [
  { title: "Inicio (Dashboard)", href: "/dashboard", roles: [1, 2, 3, 4, 5], icon: LayoutDashboard },
  { title: "Panel Sysadmin", href: "/admin-core", roles: [1], icon: Settings },
  { title: "Cargar Deuda", href: "/cargar-deuda", roles: [3, 4], requiresActiveCompany: true, icon: FilePlus2 },
  { title: "Aprobación Dual", href: "/aprobaciones", roles: [3, 4], requiresActiveCompany: true, icon: CheckSquare },
  { title: "Correcciones", href: "/correcciones", roles: [3, 4], requiresActiveCompany: true, icon: FileEdit },
  { title: "Liquidación Pendiente", href: "/liquidar-deuda", roles: [3], requiresActiveCompany: true, icon: Clock },
  { title: "Compensación (Netting)", href: "/netting", roles: [2], requiresActiveCompany: true, icon: ArrowRightLeft },
  { title: "Auditoría Web3", href: "/dashboard/auditoria", roles: [2, 3, 4, 5], icon: Search },
  { title: "Auditoría Netting", href: "/dashboard/auditoria/netting", roles: [2, 3, 4, 5], icon: Network },
];

export const configItems = [
  { title: "Perfil Corporativo", href: "/dashboard/configuracion/perfil", roles: [2, 3], icon: Building },
  { title: "Empresas Subsidiarias", href: "/dashboard/configuracion/empresas", roles: [2], icon: Briefcase },
  { title: "Gestión de Usuarios", href: "/dashboard/configuracion/usuarios", roles: [2, 3], icon: Users }
];