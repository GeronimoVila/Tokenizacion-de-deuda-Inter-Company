"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { menuItems, configItems } from "@/config/routes.config";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const rolId = session?.user?.rol_id;
  const empresaActiva = session?.user?.empresa_activa; 
  const holdingActivo = session?.user?.holding_activo; 
  const [configOpen, setConfigOpen] = useState(true);

  const entornoInactivo = (empresaActiva === false || holdingActivo === false);

  const menuPermitido = menuItems.filter(item => {
    if (!rolId || !item.roles.includes(rolId)) return false;
    if (item.requiresActiveCompany && entornoInactivo) return false;
    return true;
  });

  const configPermitido = configItems.filter(item => {
    if (!rolId || !item.roles.includes(rolId)) return false;
    if (entornoInactivo) return false;
    return true;
  });

  if (!rolId) return (
    <div className="flex flex-col w-64 bg-slate-900 h-full border-r border-slate-800 animate-pulse" />
  );

  return (
    <div className="flex flex-col w-64 bg-slate-900 h-full border-r border-slate-800 text-slate-300">
      
      <div className="flex items-center justify-center h-20 border-b border-slate-800">
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
                      : "hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-medium">{item.title}</span>
                </Link>
              </li>
            );
          })}

          {configPermitido.length > 0 && (
            <li className="px-4 pt-4 mt-4 border-t border-slate-800">
              <button 
                onClick={() => setConfigOpen(!configOpen)}
                className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
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
                              ? "bg-slate-800 text-indigo-400 font-medium" 
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
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

      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 bg-opacity-50">
          <div className={`w-2 h-2 rounded-full ${entornoInactivo ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
          <span className="text-xs font-medium text-slate-400">
            {entornoInactivo ? "Modo Auditoría" : "BFA Testnet Conectada"}
          </span>
        </div>
      </div>
    </div>
  );
}