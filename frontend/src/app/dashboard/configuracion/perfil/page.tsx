"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface PerfilData {
  nombre: string;
  cuit: string;
  wallet_address?: string;
}

export default function ConfiguracionPerfilPage() {
  const { data: session } = useSession();
  const rolId = session?.user?.rol_id;
  
  const [formData, setFormData] = useState<PerfilData>({ nombre: "", cuit: "", wallet_address: "" });
  const [tipoPerfil, setTipoPerfil] = useState<"HOLDING" | "SUBSIDIARIA" | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  useEffect(() => {
    if (session?.user?.email && (rolId === 2 || rolId === 3)) {
      cargarPerfil();
    }
  }, [session]);

  const cargarPerfil = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiUrl}/configuracion/perfil`, {
        headers: { "x-user-email": session?.user?.email || "" }
      });
      
      if (!response.ok) throw new Error("Error al cargar los datos del perfil.");
      
      const { tipo, data } = await response.json();
      setTipoPerfil(tipo);
      setFormData({
        nombre: data.nombre || "",
        cuit: data.cuit || "",
        wallet_address: data.wallet_address || ""
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const endpoint = tipoPerfil === "HOLDING" ? "/configuracion/holding" : "/configuracion/subsidiaria";

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "" 
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al actualizar los datos.");

      setSuccess(data.mensaje);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (rolId !== 2 && rolId !== 3) {
    return <div className="p-8 text-red-600 font-medium">No posees permisos para acceder a esta configuración.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Configuración de {tipoPerfil === "HOLDING" ? "Grupo Empresarial" : "Unidad de Negocio"}
        </h1>
        <p className="text-slate-500 mt-2">
          Actualiza los datos estructurales y de infraestructura Web3 de tu entidad.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {error && <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium">{error}</div>}
          {success && <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm font-medium">{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Datos Fiscales</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social / Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CUIT</label>
                <input
                  type="text"
                  name="cuit"
                  value={formData.cuit}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Módulo Web3 exclusivo para Subsidiarias */}
            {tipoPerfil === "SUBSIDIARIA" && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Infraestructura Web3</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dirección de Billetera (BFA)</label>
                  <input
                    type="text"
                    name="wallet_address"
                    value={formData.wallet_address}
                    onChange={handleInputChange}
                    placeholder="0x..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-slate-500">Esta Wallet se utilizará para la emisión (Mint) y destrucción (Burn) de los tokens representativos de deuda.</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 flex justify-end border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-lg text-white font-medium transition-all ${
                isSaving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              }`}
            >
              {isSaving ? "Guardando cambios..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}