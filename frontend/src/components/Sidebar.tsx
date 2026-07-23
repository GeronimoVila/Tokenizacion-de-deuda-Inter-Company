"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const rolId = session?.user?.rol_id;
  const [configOpen, setConfigOpen] = useState(true);

  const menuItems = [
    { 
      title: "Inicio (Dashboard)", 
      href: "/dashboard", 
      roles: [1, 2, 3, 4, 5]
    },
    { 
      title: "Panel Sysadmin", 
      href: "/admin-core", 
      roles: [1]
    },
    { 
      title: "Cargar Deuda", 
      href: "/cargar-deuda", 
      roles: [3, 4]
    },
    { 
      title: "Aprobación Dual", 
      href: "/aprobaciones", 
      roles: [3, 4]
    },
    { 
      title: "Liquidación Pendiente", 
      href: "/liquidar-deuda", 
      roles: [3]
    },
    { 
      title: "Compensación (Netting)", 
      href: "/netting", 
      roles: [2]
    },
    { 
      title: "Auditoría Web3", 
      href: "/dashboard/auditoria", 
      roles: [2, 3, 4, 5]
    },
  ];

  const configItems = [
    {
      title: "Empresas Subsidiarias",
      href: "/dashboard/configuracion/empresas",
      roles: [2]
    },
    {
      title: "Gestión de Usuarios",
      href: "/dashboard/configuracion/usuarios",
      roles: [2, 3]
    }
  ];

  const menuPermitido = menuItems.filter(item => rolId && item.roles.includes(rolId));
  const configPermitido = configItems.filter(item => rolId && item.roles.includes(rolId));

  if (!rolId) return (
    <div className="flex flex-col w-64 bg-gray-900 h-full border-r border-gray-800 animate-pulse" />
  );

  return (
    <div className="flex flex-col w-64 bg-gray-900 h-full border-r border-gray-800 text-gray-300">
      
      <div className="flex items-center justify-center h-20 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white tracking-wider">
          DEUDA <span className="text-indigo-500">B2B</span>
        </h1>
      </div>

      <div className="overflow-y-auto overflow-x-hidden grow py-6">
        <ul className="flex flex-col space-y-2">
          
          {menuPermitido.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.title} className="px-4">
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-medium">{item.title}</span>
                </Link>
              </li>
            );
          })}

          {configPermitido.length > 0 && (
            <li className="px-4 pt-4 mt-4 border-t border-gray-800">
              <button 
                onClick={() => setConfigOpen(!configOpen)}
                className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <span>Configuración</span>
                <svg 
                  className={`w-4 h-4 transform transition-transform ${configOpen ? 'rotate-180' : ''}`} 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {configOpen && (
                <ul className="mt-2 space-y-1">
                  {configPermitido.map((subItem) => {
                    const isActive = pathname === subItem.href;
                    return (
                      <li key={subItem.title}>
                        <Link
                          href={subItem.href}
                          className={`flex items-center px-4 py-2 ml-2 text-sm rounded-lg transition-colors ${
                            isActive 
                              ? "bg-gray-800 text-indigo-400 font-medium" 
                              : "text-gray-400 hover:bg-gray-800 hover:text-white"
                          }`}
                        >
                          {subItem.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          )}

        </ul>
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800 bg-opacity-50">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-medium text-gray-400">BFA Testnet Conectada</span>
        </div>
      </div>
    </div>
  );
}