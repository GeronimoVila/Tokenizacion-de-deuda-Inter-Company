"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FiltrosAuditoria, TransaccionUnificada, EmpresaBasica } from "@/types/auditoria.types";
import { Search, Copy, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AuditoriaWeb3Page() {
  const { data: session, status } = useSession();
  const [transacciones, setTransacciones] = useState<TransaccionUnificada[]>([]);
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

  const cargarEmpresas = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const response = await fetch(`${apiUrl}/empresas/todas`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "x-user-email": session.user.email },
      });
      const data = await response.json();
      if (data.success) setEmpresas(data.data);
    } catch (err) {
      console.error("Error al cargar las empresas:", err);
    }
  }, [apiUrl, session]);

  const buscarHistorial = useCallback(async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value !== "ALL") queryParams.append(key, value);
      });

      const response = await fetch(`${apiUrl}/auditoria/filtros?${queryParams.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "x-user-email": session.user.email },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al obtener el historial.");
      if (data.success) setTransacciones(data.data);
      
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFiltros((prev) => ({ ...prev, [name]: value === "ALL" ? "" : value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    buscarHistorial();
  };

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
  };

  const formatearFecha = (fechaString?: string) => {
    if (!fechaString) return "Fecha no disponible";
    const opciones: Intl.DateTimeFormatOptions = { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    };
    return new Date(fechaString).toLocaleDateString('es-AR', opciones);
  };

  const getStatusBadge = (estado: string, tokenStatus?: string) => {
    if (estado === 'RECHAZADA') {
      return <Badge variant="destructive" className="uppercase text-[10px] tracking-wider">Rechazada</Badge>;
    }
    if (estado === 'Pendiente de Validación') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[10px] tracking-wider">Pendiente de Aprobación</Badge>;
    }
    if (tokenStatus === 'Activo') {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[10px] tracking-wider">Token Activo (Vigente)</Badge>;
    }
    if (tokenStatus === 'Quemado') {
      return <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">Saldada (Token Quemado)</Badge>;
    }
    return <Badge variant="default" className="uppercase text-[10px] tracking-wider">{estado}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 font-sans bg-background min-h-screen">

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Auditoría Web3</h1>
        <p className="text-sm text-slate-500 mt-2">
          Rastree el ciclo de vida completo de las operaciones inter-company del grupo empresarial.
        </p>
      </div>

      <Card className="mb-8 shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-end gap-4 w-full">
            
            <div className="flex-1 w-full space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado Operativo</Label>
              <Select value={filtros.estadoToken || "ALL"} onValueChange={(val) => handleSelectChange("estadoToken", val)}>
                <SelectTrigger className="bg-slate-50/50">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los estados</SelectItem>
                  <SelectItem value="Pendiente de Validación">Pendientes de validación</SelectItem>
                  <SelectItem value="Emitida">Emitidas (Token activo)</SelectItem>
                  <SelectItem value="Liquidada">Liquidadas (Token quemado)</SelectItem>
                  <SelectItem value="RECHAZADA">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 w-full space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subsidiaria (Contraparte)</Label>
              <Select value={filtros.contraparteId || "ALL"} onValueChange={(val) => handleSelectChange("contraparteId", val)}>
                <SelectTrigger className="bg-slate-50/50">
                  <SelectValue placeholder="Todas las empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las empresas</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id.toString()}>
                      {empresa.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 w-full space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monto Mín.</Label>
              <Input 
                type="number" 
                name="montoMin" 
                value={filtros.montoMin} 
                onChange={handleInputChange} 
                placeholder="Ej. 100000" 
                className="bg-slate-50/50 font-mono" 
              />
            </div>

            <div className="flex-1 w-full space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha Desde</Label>
              <Input 
                type="date" 
                name="fechaInicio" 
                value={filtros.fechaInicio} 
                onChange={handleInputChange} 
                className="bg-slate-50/50" 
              />
            </div>

            <div className="w-full lg:w-auto">
              <Button type="submit" disabled={isLoading} className="w-full lg:w-32 font-bold shadow-sm">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> Filtrar</>}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {transacciones.length === 0 && !isLoading && (
          <Card className="border-dashed border-2 shadow-none bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Search className="h-12 w-12 mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900">Sin resultados</h3>
              <p className="text-sm mt-1 text-slate-500 text-center">No se encontraron operaciones que coincidan con los filtros aplicados.</p>
            </CardContent>
          </Card>
        )}

        {transacciones.map((op) => {
          const tokenData = op.tokens_deuda?.[0];
          const esRechazada = op.estado_validacion === 'RECHAZADA';

          return (
            <Card key={op.id} className={`shadow-sm overflow-hidden transition-all hover:shadow-md ${esRechazada ? 'opacity-80 border-slate-200 bg-slate-50/50' : 'border-slate-200'}`}>
              <div className={`border-b px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${esRechazada ? 'bg-slate-100/50' : 'bg-slate-50'}`}>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Operación de Deuda #{op.id}
                  </span>
                  <h3 className={`text-2xl font-extrabold tracking-tight mt-1 ${esRechazada ? 'text-slate-500' : 'text-slate-900'}`}>
                    Monto: ${Number(op.monto).toLocaleString('es-AR')} ARS
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Registrada el: {formatearFecha(op.fecha_creacion)}</p>
                </div>
                <div>
                  {getStatusBadge(op.estado_validacion, tokenData?.estado_token)}
                </div>
              </div>

              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Emisora (Acreedor)</p>
                      <p className="text-sm font-semibold text-slate-900">{op.empresa_emisora.nombre}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Receptora (Deudor)</p>
                      <p className="text-sm font-semibold text-slate-900">{op.empresa_receptora.nombre}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concepto</p>
                    <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md">{op.detalle}</p>
                  </div>
                  {op.url_documento_respaldo && (
                    <div className="pt-2">
                      <a href={op.url_documento_respaldo} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 text-sm font-bold inline-flex items-center transition-colors">
                        <FileText className="w-4 h-4 mr-2" /> Ver documento de respaldo PDF
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-center">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center">
                    Evidencia BFA (Blockchain)
                  </h4>
                  
                  { (op.estado_validacion === 'Emitida' || op.estado_validacion === 'Liquidada') && tokenData ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pasaporte Digital (ID)</p>
                        <p className="text-sm font-mono font-bold text-slate-700 bg-slate-50 border border-slate-300 px-2 py-1.5 rounded-md truncate w-full" >{tokenData.token_id_blockchain}</p>                       
                        <Button variant="ghost" size="icon" onClick={() => copiarAlPortapapeles(tokenData.token_id_blockchain)} className="h-8 w-8 text-slate-400 hover:text-primary">
                            <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">TxHash Emisión (Mint)</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1.5 rounded-md truncate w-full" title={tokenData.txhash_mint}>
                            {tokenData.txhash_mint}
                          </p>
                          <Button variant="ghost" size="icon" onClick={() => copiarAlPortapapeles(tokenData.txhash_mint)} className="h-8 w-8 text-slate-400 hover:text-primary">
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {tokenData.txhash_burn && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            TxHash Quema (Netting)
                          </p>
                          <div className="flex items-center gap-2">
                            <p 
                              className="text-xs font-mono font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-md truncate w-full" 
                              title={tokenData.txhash_burn}
                            >
                              {tokenData.txhash_burn}
                            </p>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                if (tokenData.txhash_burn) {
                                  copiarAlPortapapeles(tokenData.txhash_burn);
                                }
                              }} 
                              className="h-8 w-8 text-slate-400 hover:text-primary"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-xs font-medium text-slate-500">
                        {esRechazada 
                          ? "Operación rechazada. No se ha generado ningún activo en la red BFA."
                          : "A la espera de validación de la contraparte para emitir el pagaré digital en la BFA."}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}