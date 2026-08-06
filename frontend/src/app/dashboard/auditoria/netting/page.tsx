"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { CierrePasivoHistorial } from "@/types/auditoria.types";
import { Copy, Loader2, Network, ShieldCheck, ArrowRightLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="font-medium text-sm tracking-wide">Recuperando registros inalterables...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 font-sans bg-background min-h-screen">
      
      <div className="mb-8 w-full">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {isGlobalAdmin ? "Consolidado Global de Compensaciones" : "Estado de cuenta consolidado"}
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Resumen de saldos compensados inalterables {isGlobalAdmin ? "entre todas las filiales del Holding" : "por contraparte comercial"}.
        </p>
      </div>

      {error && <div className="p-4 mb-6 bg-destructive/10 border-l-4 border-destructive text-destructive rounded-md font-medium text-sm">{error}</div>}

      <div className="space-y-8">
        {consolidados.length === 0 && !isLoading && (
          <Card className="border-dashed border-2 shadow-none bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Network className="h-12 w-12 mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900">Sin compensaciones</h3>
              <p className="text-sm mt-1 text-slate-500 text-center">No se encontraron registros de tokens quemados por compensación algorítmica.</p>
            </CardContent>
          </Card>
        )}

        {consolidados.map((consolidado) => {
          const saldoEsPositivo = consolidado.saldo_neto_cents > BigInt(0);
          const saldoEsNegativo = consolidado.saldo_neto_cents < BigInt(0);
          
          return (
            <Card key={consolidado.id_agrupacion} className="shadow-sm border-slate-200 overflow-hidden">
              
              <div className="bg-slate-900 px-6 py-5 flex flex-row items-center justify-between gap-8 overflow-x-auto scrollbar-hide whitespace-nowrap">
                <div className="flex flex-col shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {isGlobalAdmin ? "Par Comercial" : "Subsidiaria Contraparte"}
                  </span>
                  <h3 className="text-2xl font-black text-white tracking-tight">{consolidado.contraparte_nombre}</h3>
                </div>
                
                <div className="flex flex-row items-center gap-4 shrink-0">
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                      {isGlobalAdmin ? `Deuda Bruta de ${consolidado.empresa_b_nombre}` : "Total a Favor (Cobrado)"}
                    </p>
                    <p className="text-lg font-bold text-emerald-400">${formatearMoneda(consolidado.total_a_favor_cents)}</p>
                  </div>
                  
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                      {isGlobalAdmin ? `Deuda Bruta de ${consolidado.empresa_a_nombre}` : "Total en Contra (Pagado)"}
                    </p>
                    <p className="text-lg font-bold text-rose-400">${formatearMoneda(consolidado.total_en_contra_cents)}</p>
                  </div>
                  
                  <div className={`p-3 rounded-lg border ${saldoEsPositivo ? 'bg-emerald-950/40 border-emerald-500/30' : saldoEsNegativo ? 'bg-rose-950/40 border-rose-500/30' : 'bg-slate-800/80 border-slate-700'}`}>
                    <p className="text-[10px] text-slate-300 uppercase font-bold tracking-wider mb-1">Diferencia Histórica</p>
                    <p className={`text-xl font-black tracking-tight ${saldoEsPositivo ? 'text-emerald-400' : saldoEsNegativo ? 'text-rose-400' : 'text-slate-300'}`}>
                      {saldoEsNegativo && "-"}${formatearMoneda(consolidado.saldo_neto_cents)}
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-slate-500" /> Desglose de operaciones
                </h4>
                
                <div className="space-y-4">
                  {consolidado.detalles.map((detalle, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col xl:flex-row justify-between gap-6 hover:bg-slate-100/50 transition-colors">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge variant={detalle.es_a_favor ? "outline" : "destructive"} className={detalle.es_a_favor ? "bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[10px] font-bold tracking-wider" : "uppercase text-[10px] font-bold tracking-wider"}>
                            {isGlobalAdmin 
                              ? (detalle.es_a_favor ? `A favor de ${consolidado.empresa_a_nombre}` : `A favor de ${consolidado.empresa_b_nombre}`)
                              : (detalle.es_a_favor ? 'A Favor' : 'En Contra')
                            }
                          </Badge>
                          <span className="text-xs font-mono font-bold text-slate-500">ID: #{detalle.id_token}</span>
                        </div>
                        
                        <p className="text-base font-bold text-slate-900">
                          Monto compensado: <span className="font-black">${Number(detalle.monto).toLocaleString('es-AR')} ARS</span>
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded border border-slate-100">
                          <p><span className="font-bold text-slate-400 uppercase tracking-wider mr-2">Ejecución:</span> {detalle.tipo} ({detalle.id_cierre})</p>
                          <p><span className="font-bold text-slate-400 uppercase tracking-wider mr-2">Fecha:</span> {formatearFecha(detalle.fecha)}</p>
                          {isGlobalAdmin && (
                            <p className="sm:col-span-2 mt-1 pt-2 border-t border-slate-50">
                              <span className="font-bold text-slate-400 uppercase tracking-wider mr-2">Detalle:</span> Emitido por <strong>{detalle.acreedor_nombre}</strong> hacia <strong>{detalle.deudor_nombre}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 self-center xl:max-w-md w-full shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Evidencia de Quema (BFA)
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-2 rounded-md truncate w-full" title={detalle.txhash_burn}>
                            {detalle.txhash_burn}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => copiarAlPortapapeles(detalle.txhash_burn)} 
                            className="h-8 w-8 text-slate-400 hover:text-primary shrink-0" 
                            title="Copiar Hash de Quema"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}