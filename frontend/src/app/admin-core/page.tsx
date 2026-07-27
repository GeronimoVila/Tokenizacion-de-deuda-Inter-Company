"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";

interface HoldingFormData {
  nombre: string;
  cuit: string;
  nombreAdmin: string;
  adminEmail: string;
}

export default function AdminCorePage() {
  const { data: session } = useSession();
  
  const [formData, setFormData] = useState<HoldingFormData>({
    nombre: "",
    cuit: "",
    nombreAdmin: "",
    adminEmail: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!formData.nombre || !formData.cuit || !formData.nombreAdmin || !formData.adminEmail) {
      setError("Todos los campos son obligatorios.");
      setIsLoading(false);
      return;
    }

    try {
      const backendUrl = "http://localhost:4000/api/sysadmin/holding";
      
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "sysadmin@bfa.ar",
          "Authorization": "Bearer simulado_temporal_sysadmin"
        },
        body: JSON.stringify(formData),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textError = await response.text();
        console.error("Respuesta no válida del servidor:", textError);
        throw new Error("El servidor no devolvió una respuesta JSON válida. Verifica que el backend esté corriendo en el puerto 4000.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocurrió un error al registrar el holding.");
      }

      setSuccessMsg("¡Holding y Administrador creados exitosamente! El entorno está inicializado.");
      
      setFormData({
        nombre: "",
        cuit: "",
        nombreAdmin: "",
        adminEmail: "",
      });

    } catch (err: any) {
      console.error("Error en el Onboarding:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Panel de Infraestructura (Sysadmin)</h1>
        <p className="text-slate-500 mt-2">
          Módulo exclusivo para el Onboarding inicial. Aquí se crean los nuevos grupos empresariales y sus gerentes administradores.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Inicializar Nuevo Holding</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-md text-sm">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-md text-sm">
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Datos de la Entidad</h3>
              
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-slate-700 mb-1">
                  Razón Social del Grupo
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-black"
                  placeholder="Ej. Grupo Tech S.A."
                />
              </div>

              <div>
                <label htmlFor="cuit" className="block text-sm font-medium text-slate-700 mb-1">
                  CUIT del Holding
                </label>
                <input
                  type="text"
                  id="cuit"
                  name="cuit"
                  value={formData.cuit}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-black"
                  placeholder="Sin guiones (Ej. 30123456789)"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Cuenta Administrativa</h3>
              
              <div>
                <label htmlFor="nombreAdmin" className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del Gerente / Administrador
                </label>
                <input
                  type="text"
                  id="nombreAdmin"
                  name="nombreAdmin"
                  value={formData.nombreAdmin}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-black"
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-slate-700 mb-1">
                  Correo Corporativo (Google Auth)
                </label>
                <input
                  type="email"
                  id="adminEmail"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-black"
                  placeholder="admin@grupotech.com"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-slate-100">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-2.5 rounded-lg text-white font-medium transition-all ${
                isLoading 
                  ? "bg-indigo-400 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow"
              }`}
            >
              {isLoading ? "Provisionando Entorno..." : "Registrar Holding y Administrador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}