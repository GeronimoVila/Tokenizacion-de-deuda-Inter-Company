"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface HoldingFormData {
  nombre: string;
  cuit: string;
  nombreAdmin: string;
  adminEmail: string;
}

interface Holding {
  id: number;
  nombre: string;
  cuit: string;
  activo: boolean;
  fecha_creacion: string;
}

export default function AdminCorePage() {
  const { data: session } = useSession();
  
  const [formData, setFormData] = useState<HoldingFormData>({
    nombre: "",
    cuit: "",
    nombreAdmin: "",
    adminEmail: "",
  });

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const backendUrl = "http://localhost:4000/api/sysadmin/holding";

  const fetchHoldings = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(backendUrl, {
        headers: {
          "x-user-email": session?.user?.email || "sysadmin@bfa.ar",
          "Authorization": "Bearer simulado_temporal_sysadmin"
        }
      });
      if (!response.ok) throw new Error("Error al cargar los grupos empresariales");
      const data = await response.json();
      setHoldings(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, [session]);

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
        throw new Error("El servidor no devolvió una respuesta JSON válida. Verifica que el backend esté corriendo.");
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

      fetchHoldings();

    } catch (err: any) {
      console.error("Error en el Onboarding:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHoldingStatus = async (id: number, currentStatus: boolean) => {
    const accion = currentStatus ? "desactivar" : "activar";
    if (!confirm(`¿Estás seguro de que deseas ${accion} este grupo empresarial? Esto limitará a todas sus subsidiarias a modo lectura/auditoría.`)) {
      return;
    }

    try {
      setError(null);
      setSuccessMsg(null);
      
      const response = await fetch(`${backendUrl}/${id}/toggle-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "sysadmin@bfa.ar",
          "Authorization": "Bearer simulado_temporal_sysadmin"
        },
        body: JSON.stringify({ activo: !currentStatus })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Error al ${accion} el holding.`);
      }

      setSuccessMsg(`Holding ${accion}do correctamente.`);
      fetchHoldings();
    } catch (err: any) {
      console.error("Error al cambiar estado:", err);
      setError(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Panel de Infraestructura (Sysadmin)</h1>
        <p className="text-slate-500 mt-2">
          Gestión del ecosistema. Desde aquí puedes aprovisionar nuevos holdings o suspender grupos empresariales enteros.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-md text-sm font-medium">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-md text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Inicializar Nuevo Holding</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Cuenta Administrativa Inicial</h3>
              
              <div>
                <label htmlFor="nombreAdmin" className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del Administrador del Holding
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
              {isLoading ? "Provisionando..." : "Registrar Holding"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Grupos Empresariales Registrados</h2>
          {isFetching && <span className="text-sm text-slate-500">Actualizando...</span>}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Razón Social</th>
                <th className="px-6 py-4 font-medium">CUIT</th>
                <th className="px-6 py-4 font-medium">Fecha Alta</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holdings.length === 0 && !isFetching ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No hay grupos empresariales registrados en el sistema.
                  </td>
                </tr>
              ) : (
                holdings.map((holding) => (
                  <tr key={holding.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {holding.nombre}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{holding.cuit}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(holding.fecha_creacion).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          holding.activo
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {holding.activo ? "Activo" : "Suspendido"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleHoldingStatus(holding.id, holding.activo)}
                        className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                          holding.activo
                            ? "text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                            : "text-green-600 hover:bg-green-50 border border-transparent hover:border-green-200"
                        }`}
                      >
                        {holding.activo ? "Desactivar" : "Reactivar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}