"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { CierrePasivoHistorial } from "@/types/auditoria.types";
import Link from "next/link";

interface TokenDetalle {
  id_cierre: string;
  tipo: string;
  fecha: string;
  operador: string;
  id_token: string;
  txhash_burn: string;
  monto: string;
  es_a_favor: boolean;
  acreedor_nombre: string;
  deudor_nombre: string;
}

interface ConsolidadoContraparte {
  id_agrupacion: string;
  contraparte_nombre: string;
  total_a_favor_cents: bigint;
  total_en_contra_cents: bigint;
  saldo_neto_cents: bigint;
  empresa_a_nombre?: string;
  empresa_b_nombre?: string;
  detalles: TokenDetalle[];
}

export default function AuditoriaCierresPage() {
  const { data: session, status } = useSession();
  const [cierres, setCierres] = useState<CierrePasivoHistorial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const miEmpresaId = session?.user?.empresa_id;
  const isGlobalAdmin = session?.user?.rol_id === 1 || session?.user?.rol_id === 2;
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

  const consolidados = useMemo(() => {
    if (cierres.length === 0) return [];
    if (!isGlobalAdmin && !miEmpresaId) return [];

    const mapa = new Map<string, ConsolidadoContraparte>();

    cierres.forEach(cierre => {
      cierre.tokens_quemados.forEach(token => {
        let llaveAgrupacion = "";
        let nombreTitulo = "";
        let soyAcreedor = false;
        let empA = "";
        let empB = "";

        if (isGlobalAdmin) {
          const idMenor = Math.min(token.acreedor_id, token.deudor_id);
          const idMayor = Math.max(token.acreedor_id, token.deudor_id);
          llaveAgrupacion = `GLOBAL-${idMenor}-${idMayor}`;
          
          empA = token.acreedor_id === idMenor ? token.acreedor : token.deudor;
          empB = token.acreedor_id === idMayor ? token.acreedor : token.deudor;
          nombreTitulo = `${empA} ↔ ${empB}`;
          
          soyAcreedor = token.acreedor_id === idMenor;
        } else {
          soyAcreedor = token.acreedor_id === miEmpresaId;
          const soyDeudor = token.deudor_id === miEmpresaId;

          if (!soyAcreedor && !soyDeudor) return;

          const contraparte_id = soyAcreedor ? token.deudor_id : token.acreedor_id;
          llaveAgrupacion = `SUB-${contraparte_id}`;
          nombreTitulo = soyAcreedor ? token.deudor : token.acreedor;
        }

        if (!mapa.has(llaveAgrupacion)) {
          mapa.set(llaveAgrupacion, {
            id_agrupacion: llaveAgrupacion,
            contraparte_nombre: nombreTitulo,
            total_a_favor_cents: BigInt(0),
            total_en_contra_cents: BigInt(0),
            saldo_neto_cents: BigInt(0),
            empresa_a_nombre: empA,
            empresa_b_nombre: empB,
            detalles: []
          });
        }

        const data = mapa.get(llaveAgrupacion)!;
        const montoCents = BigInt(Math.round(Number(token.monto_saldado) * 100));

        if (soyAcreedor) {
          data.total_a_favor_cents += montoCents;
        } else {
          data.total_en_contra_cents += montoCents;
        }

        data.detalles.push({
          id_cierre: cierre.id,
          tipo: cierre.tipo,
          fecha: cierre.fecha,
          operador: cierre.operador,
          id_token: token.id_token,
          txhash_burn: token.txhash_burn,
          monto: token.monto_saldado,
          es_a_favor: soyAcreedor,
          acreedor_nombre: token.acreedor,
          deudor_nombre: token.deudor
        });
      });
    });

    return Array.from(mapa.values()).map(consolidado => {
      consolidado.saldo_neto_cents = consolidado.total_a_favor_cents - consolidado.total_en_contra_cents;
      return consolidado;
    });

  }, [cierres, miEmpresaId, isGlobalAdmin]);

  const formatearMoneda = (cents: bigint) => {
    const valor = Number(cents) / 100;
    return Math.abs(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {isGlobalAdmin ? "Consolidado Global de Compensaciones" : "Estado de Cuenta Consolidado"}
          </h1>
          <p className="text-slate-500 mt-2">
            Resumen de saldos compensados inalterables {isGlobalAdmin ? "entre todas las filiales del Holding" : "por contraparte comercial"}.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex shrink-0">
          <Link 
            href="/dashboard/auditoria" 
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Volver a Auditoría Web3
          </Link>
        </div>
      </div>

      {error && <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">{error}</div>}

      <div className="space-y-8">
        {consolidados.length === 0 && !isLoading && (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            No se encontraron registros consolidados.
          </div>
        )}

        {consolidados.map((consolidado) => {
          const saldoEsPositivo = consolidado.saldo_neto_cents > BigInt(0);
          const saldoEsNegativo = consolidado.saldo_neto_cents < BigInt(0);
          
          return (
            <div key={consolidado.id_agrupacion} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-6 py-5 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {isGlobalAdmin ? "Par Comercial" : "Subsidiaria Contraparte"}
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">{consolidado.contraparte_nombre}</h3>
                </div>
                
                <div className="flex gap-4">
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50">
                    <p className="text-xs text-slate-400 uppercase font-semibold">
                      {isGlobalAdmin ? `Deuda Bruta de ${consolidado.empresa_b_nombre}` : "Total a Favor (Cobrado)"}
                    </p>
                    <p className="text-lg font-bold text-emerald-400">${formatearMoneda(consolidado.total_a_favor_cents)}</p>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50">
                    <p className="text-xs text-slate-400 uppercase font-semibold">
                      {isGlobalAdmin ? `Deuda Bruta de ${consolidado.empresa_a_nombre}` : "Total en Contra (Pagado)"}
                    </p>
                    <p className="text-lg font-bold text-rose-400">${formatearMoneda(consolidado.total_en_contra_cents)}</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${saldoEsPositivo ? 'bg-emerald-900/40 border-emerald-500/50' : saldoEsNegativo ? 'bg-rose-900/40 border-rose-500/50' : 'bg-slate-700/50 border-slate-600/50'}`}>
                    <p className="text-xs text-slate-300 uppercase font-semibold">Diferencia Histórica</p>
                    <p className={`text-xl font-black ${saldoEsPositivo ? 'text-emerald-400' : saldoEsNegativo ? 'text-rose-400' : 'text-slate-300'}`}>
                      {saldoEsNegativo && "-"}${formatearMoneda(consolidado.saldo_neto_cents)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Desglose de Operaciones</h4>
                <div className="space-y-3">
                  {consolidado.detalles.map((detalle, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col xl:flex-row justify-between gap-4 hover:bg-slate-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${detalle.es_a_favor ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {isGlobalAdmin 
                              ? (detalle.es_a_favor ? `Deuda a favor de ${consolidado.empresa_a_nombre}` : `Deuda a favor de ${consolidado.empresa_b_nombre}`)
                              : (detalle.es_a_favor ? 'A Favor' : 'En Contra')
                            }
                          </span>
                          <span className="text-sm font-bold text-slate-600">ID: #{detalle.id_token}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800">
                          Monto Compensado: ${Number(detalle.monto).toLocaleString('es-AR')} ARS
                        </p>
                        <div className="mt-1 text-xs text-slate-500">
                          <p><span className="font-semibold text-slate-400 uppercase">Ejecución:</span> {detalle.tipo} ({detalle.id_cierre})</p>
                          <p><span className="font-semibold text-slate-400 uppercase">Fecha:</span> {formatearFecha(detalle.fecha)}</p>
                          {isGlobalAdmin && (
                            <p className="mt-1">
                              <span className="font-semibold text-slate-400 uppercase">Detalle:</span> Emitido por <strong>{detalle.acreedor_nombre}</strong> hacia <strong>{detalle.deudor_nombre}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-white border border-slate-200 rounded p-3 self-center xl:max-w-md w-full">
                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Evidencia de Quema (BFA)</p>
                        <div className="flex items-center bg-slate-50 p-2 rounded border border-slate-100">
                          <p className="text-xs font-mono text-slate-600 truncate mr-2" title={detalle.txhash_burn}>
                            {detalle.txhash_burn}
                          </p>
                          <button onClick={() => copiarAlPortapapeles(detalle.txhash_burn)} className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0" title="Copiar Hash de Quema">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}