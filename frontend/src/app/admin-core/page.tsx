"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// 1. Definimos el esquema de validación estricto con Zod
const holdingSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  cuit: z.string().regex(/^\d{11}$/, "El CUIT debe contener exactamente 11 números (sin guiones)"),
});

// Inferimos el tipo TypeScript a partir del esquema
type HoldingFormData = z.infer<typeof holdingSchema>;

export default function AdminCorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 2. Inicializamos React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HoldingFormData>({
    resolver: zodResolver(holdingSchema),
  });

  // 3. Protección de ruta (RBAC en Frontend)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/"); // Redirige al login si no hay sesión
    } else if (status === "authenticated") {
      // Validamos que el rol sea 1 (Sysadmin). 
      // NOTA: Asegúrate de que tu NextAuth devuelva 'rol_id' en el objeto session.user
      if (session?.user?.rol_id !== 1) {
        router.push("/dashboard"); // Si es un usuario normal, al dashboard
      }
    }
  }, [status, session, router]);

  // Si está cargando la sesión, mostramos un loader
  if (status === "loading") {
    return <div className="flex justify-center items-center h-screen">Verificando credenciales...</div>;
  }

  // 4. Función de envío al Backend
  const onSubmit = async (data: HoldingFormData) => {
    setServerError(null);
    setSuccessMessage(null);

    try {
      // Obtenemos el email de la sesión para el header
      const userEmail = session?.user?.email;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      const response = await fetch(`${apiUrl}/sysadmin/holdings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail || "", // Inyectamos el header para tu middleware
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Ocurrió un error al crear el holding");
      }

      setSuccessMessage("¡Holding creado exitosamente en la base de datos!");
      reset(); // Limpiamos el formulario

    } catch (error: any) {
      setServerError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Panel Sysadmin (Top Secret)
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Alta de Grupos Empresariales (Holdings)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* Mensajes de feedback */}
          {serverError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
              {serverError}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre del Holding
              </label>
              <div className="mt-1">
                <input
                  id="nombre"
                  type="text"
                  {...register("nombre")}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.nombre ? "border-red-300" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
                {errors.nombre && (
                  <p className="mt-2 text-sm text-red-600">{errors.nombre.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="cuit" className="block text-sm font-medium text-gray-700">
                CUIT (11 números, sin guiones)
              </label>
              <div className="mt-1">
                <input
                  id="cuit"
                  type="text"
                  {...register("cuit")}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.cuit ? "border-red-300" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
                {errors.cuit && (
                  <p className="mt-2 text-sm text-red-600">{errors.cuit.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
              >
                {isSubmitting ? "Creando..." : "Registrar Holding"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}