"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRightLeft, Flame, CheckCircle2, AlertCircle, Loader2, Building2, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EmpresaInfo {
  id: number;
  nombre: string;
}

interface DeudaOriginal {
  id: number;
  monto: number;
  tokens: any[];
}

interface OportunidadCompensacion {
  empresaA: EmpresaInfo;
  empresaB: EmpresaInfo;
  deudaBruta_A_hacia_B: number; 
  deudaBruta_B_hacia_A: number; 
  montoACompensar: number;      
  saldoNetoFinal_A_hacia_B: number; 
  saldoNetoFinal_B_hacia_A: number; 
  deudasA_B: DeudaOriginal[];
  deudasB_A: DeudaOriginal[];
}

interface SaldoGlobal {
  acreedor: string;
  deudor: string;
  monto_total: number;
  cantidad_tokens: number;
}

export default function NettingPage() {
  const { data: session } = useSession();
  const [oportunidades, setOportunidades] = useState<OportunidadCompensacion[]>([]);
  const [saldosGlobales, setSaldosGlobales] = useState<SaldoGlobal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);
  const esAdministrador = session?.user?.rol_id === 1 || session?.user?.rol_id === 2;

  useEffect(() => {
    if (session?.user?.email) {
      cargarOportunidades();
    }
  }, [session]);

  const cargarOportunidades = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/netting/simular`, {
        headers: { "x-user-email": session?.user?.email || "" },
      });
      
      if (!res.ok) throw new Error("Error al consultar el motor de compensación.");
      const responseBody = await res.json();

      setOportunidades(responseBody.data?.oportunidades || []);
      setSaldosGlobales(responseBody.data?.saldos_activos || []);
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: "No se pudieron calcular las oportunidades de Netting." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEjecutarCompensacion = async (oportunidad: OportunidadCompensacion, index: number) => {
    const confirmacion = confirm(
      `¿Confirma la compensación (quema en blockchain) por $${oportunidad.montoACompensar} entre ${oportunidad.empresaA.nombre} y ${oportunidad.empresaB.nombre}? Esta acción es irreversible.`
    );
    
    if (!confirmacion) return;

    setProcesando(index);
    setMensaje(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const payload = { oportunidades: [oportunidad] };

      const res = await fetch(`${apiUrl}/netting/ejecutar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al ejecutar la compensación en Web3.");

      setMensaje({ 
        tipo: "exito", 
        texto: `¡Compensación exitosa! Se cruzaron saldos por $${oportunidad.montoACompensar} y los pagarés fueron destruidos en la BFA.` 
      });
      
      cargarOportunidades();
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setProcesando(null);
    }
  };

  const formatearDinero = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(monto);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="font-medium text-sm tracking-wide">Calculando saldos cruzados y balances del Holding...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 bg-background min-h-screen font-sans">
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Scale className="w-8 h-8 text-primary" />
          Motor de compensación
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Cruce automatizado de saldos para optimización de liquidez inter-company. Las deudas neteadas se queman permanentemente en la BFA.
        </p>
      </div>

      {mensaje && (
        <Alert 
          variant={mensaje.tipo === "error" ? "destructive" : "default"} 
          className={`mb-8 shadow-sm ${mensaje.tipo === "exito" ? "bg-emerald-50 text-emerald-900 border-emerald-200" : ""}`}
        >
          {mensaje.tipo === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          <AlertTitle className="font-bold">
            {mensaje.tipo === "error" ? "Error de Procesamiento" : "Operación Web3 Exitosa"}
          </AlertTitle>
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      <div className="mb-12">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-slate-500" /> Oportunidades de cruce detectadas
        </h2>
        
        {oportunidades.length === 0 ? (
          <Card className="border-dashed border-2 shadow-none bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-slate-400">
              <CheckCircle2 className="h-12 w-12 mb-4 text-emerald-500/50" />
              <h3 className="text-lg font-semibold text-slate-900">Cuentas cruzadas optimizadas</h3>
              <p className="text-sm mt-1 text-slate-500 text-center">El algoritmo no detecta deudas cruzadas compensables en este momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {oportunidades.map((op, index) => (
              <Card key={index} className="shadow-sm border-t-4 border-t-primary overflow-hidden">
                
                <div className="bg-slate-900 p-6 flex flex-col md:flex-row justify-between md:items-center gap-6">
                  <div>
                    <Badge variant="outline" className="bg-primary/20 text-primary-foreground border-primary/30 uppercase text-[10px] font-bold tracking-widest mb-3">
                      Cruce Detectado
                    </Badge>
                    <div className="flex flex-wrap items-center gap-3 text-xl font-black text-white">
                      <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
                        <Building2 className="w-4 h-4 text-slate-400" /> {op.empresaA.nombre}
                      </div>
                      <ArrowRightLeft className="w-5 h-5 text-slate-500" />
                      <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
                        <Building2 className="w-4 h-4 text-slate-400" /> {op.empresaB.nombre}
                      </div>
                    </div>
                  </div>

                  <div className="text-left md:text-right bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto a Compensar (Ahorro)</p>
                    <p className="text-3xl font-black text-emerald-400">
                      {formatearDinero(op.montoACompensar)}
                    </p>
                  </div>
                </div>

                <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50">
                  
                  <div className="p-6 md:p-8 space-y-4">
                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Deuda de {op.empresaA.nombre}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Deuda Bruta Acumulada:</span>
                        <span className="font-bold text-destructive">{formatearDinero(op.deudaBruta_A_hacia_B)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">A cancelar por Netting:</span>
                        <span className="font-bold text-emerald-600">- {formatearDinero(op.montoACompensar)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                        <span className="font-bold text-slate-900">Saldo Remanente a Pagar:</span>
                        <span className={`font-black text-lg ${Number(op.saldoNetoFinal_A_hacia_B) > 0 ? "text-amber-600" : "text-slate-400"}`}>
                          {formatearDinero(op.saldoNetoFinal_A_hacia_B)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-4">
                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Deuda de {op.empresaB.nombre}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Deuda Bruta Acumulada:</span>
                        <span className="font-bold text-destructive">{formatearDinero(op.deudaBruta_B_hacia_A)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">A cancelar por Netting:</span>
                        <span className="font-bold text-emerald-600">- {formatearDinero(op.montoACompensar)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                        <span className="font-bold text-slate-900">Saldo Remanente a Pagar:</span>
                        <span className={`font-black text-lg ${Number(op.saldoNetoFinal_B_hacia_A) > 0 ? "text-amber-600" : "text-slate-400"}`}>
                          {formatearDinero(op.saldoNetoFinal_B_hacia_A)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
                  {esAdministrador ? (
                    <Button
                      onClick={() => handleEjecutarCompensacion(op, index)}
                      disabled={procesando !== null}
                      size="lg"
                      className="font-bold shadow-sm"
                    >
                      {procesando === index ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Quemando Tokens en Web3...</>
                      ) : (
                        <><Flame className="w-4 h-4 mr-2" /> Confirmar y Ejecutar Netting</>
                      )}
                    </Button>
                  ) : (
                    <p className="text-xs font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-md border border-amber-200">
                      Solo la Administración Global puede ejecutar el Netting.
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-500" /> Estado de cuenta consolidado
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Detalle de todos los saldos activos en el Holding (Incluyendo deudas unilaterales y saldos remanentes previos a la liquidación final).
          </p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-0">
            {saldosGlobales.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm font-medium">
                No hay saldos de deuda pendientes en todo el holding.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-900">
                  <TableRow className="hover:bg-slate-900 border-b-0">
                    <TableHead className="font-bold text-slate-300">Empresa acreedora</TableHead>
                    <TableHead className="font-bold text-slate-300">Empresa deudora (A pagar por)</TableHead>
                    <TableHead className="font-bold text-slate-300 text-right">Saldo total activo</TableHead>
                    <TableHead className="font-bold text-slate-300 text-center">Tokens respaldatorios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saldosGlobales.map((saldo, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-bold text-slate-900">{saldo.acreedor}</TableCell>
                      <TableCell className="font-medium text-slate-600">{saldo.deudor}</TableCell>
                      <TableCell className="font-black text-primary text-right text-lg">
                        {formatearDinero(saldo.monto_total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 font-bold">
                          {saldo.cantidad_tokens} Pagaré{saldo.cantidad_tokens !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}