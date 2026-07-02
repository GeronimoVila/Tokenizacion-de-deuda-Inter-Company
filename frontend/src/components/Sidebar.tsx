"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Sidebar() {
  const { data: session } = useSession();
  const rolId = session?.user?.rol_id;

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-blue-400">Deuda InterCo</h2>
        <p className="text-xs text-gray-400 mt-1">
          {session?.user?.email || "Usuario no autenticado"}
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <Link href="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-800 transition">
          Dashboard
        </Link>

        {(rolId === 1 || rolId === 2) && (
          <Link href="/netting" className="block px-4 py-2 rounded hover:bg-gray-800 transition text-yellow-400">
            Compensación (Netting)
          </Link>
        )}

        {[1, 2, 3].includes(rolId!) && (
          <Link href="/aprobaciones" className="block px-4 py-2 rounded hover:bg-gray-800 transition">
            Aprobar Emisiones
          </Link>
        )}

        {[1, 2, 3, 4].includes(rolId!) && (
          <Link href="/cargar-deuda" className="block px-4 py-2 rounded hover:bg-gray-800 transition">
            Cargar Deuda
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800 rounded transition"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}