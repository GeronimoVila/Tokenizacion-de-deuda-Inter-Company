"use client";

import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center">
        <h2 className="text-lg font-medium text-gray-800">Panel de Control</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex flex-col text-right">
          <span className="text-sm font-semibold text-gray-900">
            {session?.user?.name || "Usuario"}
          </span>
          <span className="text-xs text-gray-500">
            {session?.user?.email}
          </span>
        </div>
        
        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
          {session?.user?.name?.charAt(0).toUpperCase() || "U"}
        </div>

        <div className="pl-4 border-l border-gray-300">
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}