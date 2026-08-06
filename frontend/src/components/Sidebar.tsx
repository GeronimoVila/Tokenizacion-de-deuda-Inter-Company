"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { ChevronDown, Landmark } from "lucide-react";
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
    <div className="flex flex-col w-64 bg-slate-100 h-screen border-r border-slate-200 animate-pulse" />
  );

  return (
    <div className="flex flex-col w-64 bg-slate-100 h-screen border-r border-slate-200 text-slate-900 font-sans shadow-sm z-20 sticky top-0">
      
      <div className="flex items-center justify-center h-24 min-h-24 border-b border-slate-200 px-6 bg-slate-100/50">
        <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 shadow-sm">
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
            DEUDA <span className="text-primary">B2B</span>
          </h1>
        </Link>
      </div>

      <div className="overflow-y-auto overflow-x-hidden grow py-6 custom-scrollbar">
        <ul className="flex flex-col space-y-1.5 px-3">
          
          {menuPermitido.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-md transition-all text-sm font-semibold ${
                    isActive 
                      ? "bg-white text-primary shadow-sm border border-slate-200/60" 
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 ${isActive ? "text-primary" : "text-slate-400"}`} />
                  {item.title}
                </Link>
              </li>
            );
          })}

          {configPermitido.length > 0 && (
            <li className="pt-4 mt-4 border-t border-slate-200">
              <button 
                onClick={() => setConfigOpen(!configOpen)}
                className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors focus:outline-none"
              >
                <span>Administración</span>
                <ChevronDown 
                  className={`w-4 h-4 transform transition-transform duration-200 ${configOpen ? 'rotate-180' : ''}`} 
                />
              </button>
              
              <div className={`grid transition-all duration-200 ease-in-out ${configOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
                <ul className="overflow-hidden space-y-1">
                  {configPermitido.map((subItem) => {
                    const isActive = pathname === subItem.href;
                    const SubIcon = subItem.icon;
                    return (
                      <li key={subItem.title}>
                        <Link
                          href={subItem.href}
                          className={`flex items-center px-3 py-2 ml-1 text-sm rounded-md transition-all font-medium ${
                            isActive 
                              ? "bg-white text-primary shadow-sm border border-slate-200/60" 
                              : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                          }`}
                        >
                          <SubIcon className={`w-4 h-4 mr-3 ${isActive ? "text-primary" : "text-slate-400"}`} />
                          {subItem.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          )}

        </ul>
      </div>
    </div>
  );
}