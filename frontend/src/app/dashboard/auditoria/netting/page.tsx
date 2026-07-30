"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { CierrePasivoHistorial } from "@/types/auditoria.types";
import Link from "next/link";

export default function AuditoriaCierresPage() {
  const { data: session, status } = useSession();
  const [cierres, setCierres] = useState<CierrePasivoHistorial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  const buscarHistorialCierres = useCallback(async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/auditoria/cierres-pasivos`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session.user.email,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al obtener el historial de cierres.");
      if (data.success) setCierres(data.data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, session]);

  useEffect(() => {
    if (status === "authenticated") {
      buscarHistorialCierres();
    }
  }, [status, buscarHistorialCierres]);

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
    alert("Hash copiado al portapapeles. Listo para verificar en el explorador de la BFA.");
  };

  const formatearFecha = (fechaString: string) => {
    const opciones: Intl.DateTimeFormatOptions = { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    };
    return new Date(fechaString).toLocaleDateString('es-AR', opciones);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Auditoría de Cierre de Pasivos (Burning)</h1>
          <p className="text-slate-500 mt-2">
            Verifique el registro inalterable de los pagarés digitales destruidos, ya sea por Netting o por Transferencia.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex shrink-0">
          <Link 
            href="/dashboard/auditoria" 
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Volver a Emisión de Deudas
          </Link>
        </div>
      </div>

      {error && <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">{error}</div>}

      <div className="space-y-8">
        {cierres.length === 0 && !isLoading && (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            No se encontraron registros de tokens quemados o liquidados.
          </div>
        )}

        {cierres.map((cierre) => (
          <div key={cierre.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`px-6 py-4 flex flex-col md:flex-row justify-between md:items-center ${cierre.tipo === 'Netting Algorítmico' ? 'bg-slate-800' : 'bg-indigo-900'}`}>
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {cierre.tipo} | REF: {cierre.id}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{cierre.descripcion}</h3>
                <p className="text-xs text-slate-400 mt-1">Ejecutado el: {formatearFecha(cierre.fecha)}</p>
              </div>
              <div className="mt-4 md:mt-0 text-left md:text-right">
                <p className="text-xs text-slate-400 uppercase">Operador Responsable</p>
                <p className="text-sm font-medium text-white">{cierre.operador}</p>
              </div>
            </div>

            <div className="p-6">
              <h4 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Activos Digitales Involucrados (Burn)</h4>
              <div className="space-y-4">
                {cierre.tokens_quemados.map((token, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold uppercase">Token Destruido</span>
                        <span className="text-sm font-mono text-slate-500">ID: #{token.id_token}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        Monto Saldado: ${Number(token.monto_saldado).toLocaleString('es-AR')} ARS
                      </p>
                      <div className="mt-2 text-xs text-slate-600">
                        <p><span className="font-semibold text-slate-400 uppercase">Deudor (Acreedor):</span> {token.acreedor}</p>
                        <p><span className="font-semibold text-slate-400 uppercase">A favor de (Deudor):</span> {token.deudor}</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 bg-white border border-slate-200 rounded p-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Evidencia de Quema (BFA)</p>
                      <div className="flex items-center">
                        <p className="text-xs font-mono text-slate-600 truncate w-48 mr-2" title={token.txhash_burn}>
                          {token.txhash_burn}
                        </p>
                        <button onClick={() => copiarAlPortapapeles(token.txhash_burn)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Copiar Hash de Quema">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}