"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="p-10 text-center">Cargando seguridad...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Tokenización Intercompany</h1>
        
        {session ? (
          <div>
            <p className="text-gray-600 mb-2">Bienvenido,</p>
            <p className="font-bold text-lg text-blue-600 mb-4">{session.user?.name}</p>
            <p className="text-sm text-gray-500 mb-6">{session.user?.email}</p>
            <button
              onClick={() => signOut()}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-6">Por favor, identifícate para continuar.</p>
            <button
              onClick={() => signIn("google")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors w-full"
            >
              Iniciar sesión con Google
            </button>
          </div>
        )}
      </div>
    </main>
  );
}