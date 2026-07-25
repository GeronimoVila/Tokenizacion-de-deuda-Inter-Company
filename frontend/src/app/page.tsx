"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  // 1. Intercepción: Si el usuario ya está autenticado, lo redirigimos al dashboard inmediatamente
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // 2. Estado de Carga: Previene parpadeos en la UI mientras NextAuth valida el token con Google
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse text-lg font-semibold text-blue-600">
          Verificando credenciales corporativas...
        </div>
      </div>
    );
  }

  // 3. Vista Pública: Solo se renderiza si el usuario no tiene una sesión activa
  if (status === "unauthenticated") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full border border-gray-100">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 tracking-tight">
            Tokenización Inter-Company
          </h1>
          
          <div>
            <p className="text-gray-600 mb-6 text-sm">
              Acceso restringido. Por favor, identifícate con tu cuenta corporativa para acceder a la plataforma.
            </p>
            <button
              // El parámetro callbackUrl asegura la redirección nativa post-autenticación
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors w-full shadow-sm"
            >
              Iniciar sesión con Google
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Retorno de seguridad (fallback)
  return null;
}