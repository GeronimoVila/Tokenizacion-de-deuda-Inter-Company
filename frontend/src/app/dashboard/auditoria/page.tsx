// frontend/src/app/dashboard/auditoria/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FiltrosAuditoria, TokenDeudaHistorial } from "@/types/auditoria.types";

export interface EmpresaBasica {
  id: number;
  nombre: string;
  cuit: string;
}

export default function AuditoriaWeb3Page() {
  const { data: session, status } = useSession();
  const [tokens, setTokens] = useState<TokenDeudaHistorial[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaBasica[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({
    fechaInicio: "",
    fechaFin: "",
    contraparteId: "", 
    montoMin: "",
    montoMax: "",
    estadoToken: "",
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  // El backend automáticamente excluirá la empresa del usuario si es Operador, Auditor o Admin de Subsidiaria
  const cargarEmpresas = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const response = await fetch(`${apiUrl}/empresas/todas`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session.user.email,
        },
      });
      const data = await response.json();
      if (data.success) {
        setEmpresas(data.data);
      }
    } catch (err) {
      console.error("Error al cargar las empresas para el filtro:", err);
    }
  }, [apiUrl, session]);

  const buscarHistorial = useCallback(async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`${apiUrl}/auditoria/filtros?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session.user.email,
        },
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Error al obtener el historial.");
      if (data.success) setTokens(data.data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filtros, apiUrl, session]);

  useEffect(() => {
    if (status === "authenticated") {
      cargarEmpresas();
      buscarHistorial();
    }
  }, [status, buscarHistorial, cargarEmpresas]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    buscarHistorial();
  };

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
    alert("Hash copiado al portapapeles. Listo para verificar en el explorador BFA.");
  };

  const formatearFecha = (fechaString: string) => {
    if (!fechaString) return "Fecha no disponible";
    const opciones: Intl.DateTimeFormatOptions = { 
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    };
    return new Date(fechaString).toLocaleDateString('es-AR', opciones);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Auditoría Web3</h1>
        <p className="text-slate-500 mt-2">
          Rastree el historial inalterable de las operaciones financieras del grupo empresarial en la Blockchain Federal Argentina.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase">Estado</label>
            <select name="estadoToken" value={filtros.estadoToken} onChange={handleFilterChange} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm">
              <option value="">Todos</option>
              <option value="Activo">Activos (Vigente)</option>
              <option value="Quemado">Quemados (Compensados)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase">Subsidiaria (Contraparte)</label>
            <select 
              name="contraparteId" 
              value={filtros.contraparteId} 
              onChange={handleFilterChange} 
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
            >
              <option value="">Todas las empresas</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase">Monto Mín.</label>
            <input type="number" name="montoMin" value={filtros.montoMin} onChange={handleFilterChange} placeholder="Ej. 100000" className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase">Fecha Desde</label>
            <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFilterChange} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50">
              {isLoading ? "Buscando..." : "Filtrar"}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">{error}</div>}

      <div className="space-y-6">
        {tokens.length === 0 && !isLoading && (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            No se encontraron operaciones que coincidan con los filtros.
          </div>
        )}

        {tokens.map((token) => (
          <div key={token.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pasaporte Digital ID: #{token.token_id_blockchain}</span>
                <h3 className="text-lg font-bold text-slate-800 mt-1">
                  Monto: ${Number(token.monto_actual).toLocaleString('es-AR')} ARS
                </h3>
                <p className="text-xs text-slate-500 mt-1">Operación validada el: {formatearFecha(token.transaccion.fecha_validacion)}</p>
              </div>
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${token.estado_token === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {token.estado_token}
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Emisora (Acreedor)</p>
                  <p className="text-sm font-medium text-slate-900">{token.transaccion.empresa_emisora.nombre}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Receptora (Deudor)</p>
                  <p className="text-sm font-medium text-slate-900">{token.transaccion.empresa_receptora.nombre}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Detalle</p>
                  <p className="text-sm text-slate-700">{token.transaccion.detalle}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <h4 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">Trazabilidad BFA (Blockchain)</h4>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">TxHash Emisión (Mint)</p>
                  <div className="flex items-center mt-1">
                    <p className="text-xs font-mono text-slate-600 truncate w-48 mr-2">{token.txhash_mint}</p>
                    <button onClick={() => copiarAlPortapapeles(token.txhash_mint)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Copiar Hash">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}