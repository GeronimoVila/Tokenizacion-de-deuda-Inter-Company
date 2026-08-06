"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AlertCircle, CheckCircle2, Loader2, FileText, Landmark, Wallet, ArrowRightLeft, AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SaldoGlobal {
  deudor_id: number;
  acreedor_id: number;
  deudor: string;
  acreedor: string;
  monto_total: number;
  cantidad_tokens: number;
}

interface Empresa {
  id: number;
  nombre: string;
}

interface TransaccionDeuda {
  id: number;
  monto: number;
  detalle: string;
  url_documento_respaldo: string;
  empresa_emisora: Empresa;
  empresa_receptora: Empresa;
}

interface OportunidadNetting {
  empresaA: Empresa;
  empresaB: Empresa;
  montoACompensar: number;
}

export default function LiquidarDeudaPage() {
  const { data: session } = useSession();
  
  const [saldos, setSaldos] = useState<SaldoGlobal[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadNetting[]>([]);
  const [pagosRecibidos, setPagosRecibidos] = useState<TransaccionDeuda[]>([]);
  const [pagosEnviados, setPagosEnviados] = useState<TransaccionDeuda[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [tipoAccion, setTipoAccion] = useState<"aprobar" | "rechazar" | null>(null);

  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<SaldoGlobal | null>(null);
  const [referenciaBancaria, setReferenciaBancaria] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [modalRechazo, setModalRechazo] = useState<{ isOpen: boolean; liquidacionId: number | null }>({ isOpen: false, liquidacionId: null });
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const miEmpresaId = session?.user?.empresa_id;

  useEffect(() => {
    if (session?.user?.email) {
      cargarDatos();
    }
  }, [session]);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      
      const resSaldos = await fetch(`${apiUrl}/netting/simular`, {
        headers: { "x-user-email": session?.user?.email || "" }
      });
      if (resSaldos.ok) {
        const resultSaldos = await resSaldos.json();
        setSaldos(resultSaldos.data.saldos_activos || []);
        setOportunidades(resultSaldos.data.oportunidades || []);
      }

      const resPendientes = await fetch(`${apiUrl}/deudas/dashboard`, {
        headers: { "x-user-email": session?.user?.email || "" }
      });
      if (resPendientes.ok) {
        const resultPendientes = await resPendientes.json();
        const pendientes = resultPendientes.data.listados.tramites_pendientes || [];
        
        const recibidos = pendientes.filter((p: TransaccionDeuda) => 
          p.detalle.includes("Liquidación de Saldo") && p.empresa_receptora.id === miEmpresaId
        );
        const enviados = pendientes.filter((p: TransaccionDeuda) => 
          p.detalle.includes("Liquidación de Saldo") && p.empresa_emisora.id === miEmpresaId
        );

        setPagosRecibidos(recibidos);
        setPagosEnviados(enviados);
      }
    } catch (error) {
      console.error("Error cargando datos", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        setMensaje({ tipo: "error", texto: "El comprobante del banco debe ser un archivo PDF." });
        return;
      }
      setComprobante(file);
      setMensaje(null);
    }
  };

  const handleSubmitPago = async (e: React.FormEvent) => {  
    e.preventDefault();
    if (!deudaSeleccionada || !comprobante || !miEmpresaId) return;

    setIsSubmittingForm(true);
    setMensaje(null);

    try {
      const detalleAutogenerado = `Liquidación de Saldo (Transferencia Bancaria). Ref: ${referenciaBancaria}`;

      const data = new FormData();
      data.append("empresa_contraparte_id", String(deudaSeleccionada.acreedor_id));
      data.append("monto", String(deudaSeleccionada.monto_total));
      data.append("detalle", detalleAutogenerado);
      data.append("comprobante", comprobante);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const response = await fetch(`${apiUrl}/deudas/registrar`, {
        method: "POST",
        headers: { "x-user-email": session?.user?.email || "" },
        body: data, 
      });

      if (!response.ok) throw new Error("Error al informar el pago.");

      setMensaje({ tipo: "exito", texto: "¡Pago informado con éxito! Esperando validación de la contraparte." });
      setDeudaSeleccionada(null);
      setReferenciaBancaria("");
      setComprobante(null);
      cargarDatos();
    } catch (error: any) {
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleAprobarCobro = async (id: number) => {
    if (!confirm("¿El dinero ingresó a tu cuenta bancaria? Esto quemará los tokens remanentes de manera irreversible en la BFA.")) return;
    
    setProcesandoId(id);
    setTipoAccion("aprobar");
    setMensaje(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/deudas/${id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": session?.user?.email || "" },
      });

      if (!res.ok) throw new Error("Error al aprobar el pago. Verifique saldos on-chain.");
      setMensaje({ tipo: "exito", texto: "¡Cobro verificado y Tokens liquidados en la Blockchain!" });
      cargarDatos();
    } catch (error: any) {
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setProcesandoId(null);
      setTipoAccion(null);
    }
  };

  const abrirModalRechazo = (id: number) => {
    setModalRechazo({ isOpen: true, liquidacionId: id });
    setMotivoRechazo("");
  };

  const confirmarRechazo = async () => {
    if (!modalRechazo.liquidacionId || !motivoRechazo.trim()) {
      setMensaje({ tipo: "error", texto: "Debe proporcionar un motivo de rechazo válido." });
      return;
    }
    
    setProcesandoId(modalRechazo.liquidacionId);
    setTipoAccion("rechazar");
    setMensaje(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/deudas/${modalRechazo.liquidacionId}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": session?.user?.email || "" },
        body: JSON.stringify({ motivoRechazo })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al rechazar el pago.");
      
      setMensaje({ tipo: "exito", texto: "Comprobante rechazado. La contraparte deberá informarlo nuevamente." });
      setModalRechazo({ isOpen: false, liquidacionId: null });
      cargarDatos();
    } catch (error: any) {
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setProcesandoId(null);
      setTipoAccion(null);
    }
  };

  const misDeudas = saldos.filter(s => s.deudor_id === miEmpresaId);
  const misCobros = saldos.filter(s => s.acreedor_id === miEmpresaId);

  const tieneNettingPendiente = (otraEmpresaId: number) => {
    return oportunidades.some(op => 
      (op.empresaA.id === miEmpresaId && op.empresaB.id === otraEmpresaId) ||
      (op.empresaB.id === miEmpresaId && op.empresaA.id === otraEmpresaId)
    );
  };

  const deudasBloqueadas = misDeudas.filter(d => tieneNettingPendiente(d.acreedor_id));
  const deudasParaLiquidar = misDeudas.filter(d => !tieneNettingPendiente(d.acreedor_id));
  
  const hayProcesamientoActivo = procesandoId !== null || isSubmittingForm;

  const formatearDinero = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(monto);
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="font-medium text-sm tracking-wide">Sincronizando estado de cuenta con la Blockchain...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 bg-background min-h-screen font-sans">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-2">Liquidación de saldos remanentes</h1>
        <p className="text-sm text-slate-500">Informa tus pagos físicos únicamente para las deudas unilaterales que queden luego de que el algoritmo de Netting haya operado.</p>
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
            {mensaje.tipo === "error" ? "Atención" : "Operación Exitosa"}
          </AlertTitle>
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-sm border-t-4 border-t-destructive">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Landmark className="h-5 w-5" /> Deudas pendientes de pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            {misDeudas.length === 0 ? (
              <p className="text-muted-foreground italic text-sm text-center py-6">No tienes deudas activas.</p>
            ) : (
              <div className="space-y-4">
                
                {deudasBloqueadas.map((deuda, idx) => (
                  <div key={`bloq-${idx}`} className="p-4 border border-amber-200 rounded-lg bg-amber-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Acreedor</p>
                        <p className="font-bold text-slate-900">{deuda.acreedor}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-amber-700">{formatearDinero(deuda.monto_total)}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 mt-2 w-full justify-center py-1">
                      <AlertTriangle className="w-3 h-3 mr-1.5" /> Saldos cruzados detectados. Ejecuta Netting primero.
                    </Badge>
                  </div>
                ))}

                {deudasParaLiquidar.map((deuda, idx) => (
                  <div key={`liq-${idx}`} className="p-4 border rounded-lg border-slate-200 bg-slate-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Acreedor</p>
                        <p className="font-bold text-slate-900">{deuda.acreedor}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-destructive">{formatearDinero(deuda.monto_total)}</p>
                      </div>
                    </div>
                    
                    {session?.user?.empresa_activa === false ? (
                      <div className="w-full mt-2 text-center text-destructive text-sm font-bold bg-destructive/10 p-2 rounded-md border border-destructive/20 flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" /> Acción bloqueada (Baja Lógica)
                      </div>
                    ) : (
                      <Button 
                        variant="outline"
                        onClick={() => setDeudaSeleccionada(deuda)} 
                        disabled={hayProcesamientoActivo}
                        className="w-full font-bold shadow-sm"
                      >
                        <Wallet className="w-4 h-4 mr-2" /> Informar Transferencia Bancaria
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pagosEnviados.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pagos Informados (Esperando Validación)</h3>
                <div className="space-y-2">
                  {pagosEnviados.map(liq => (
                    <div key={liq.id} className="p-3 bg-slate-50 rounded-md text-sm flex justify-between items-center border border-slate-200">
                      <span className="text-slate-600">A: <strong className="text-slate-900">{liq.empresa_receptora.nombre}</strong></span>
                      <Badge variant="secondary" className="text-slate-500 bg-slate-100 border-slate-200">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pendiente
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-8">
          
          <Card className="shadow-sm border-t-4 border-t-amber-500">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-amber-700 flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" /> Validar pagos recibidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pagosRecibidos.length === 0 ? (
                <p className="text-muted-foreground italic text-sm text-center py-4">No hay transferencias pendientes de validación.</p>
              ) : (
                <div className="space-y-4">
                  {pagosRecibidos.map((liq) => {
                    const esElProcesado = procesandoId === liq.id;
                    const estaQuemando = esElProcesado && tipoAccion === "aprobar";

                    return (
                      <div key={liq.id} className="p-4 border border-amber-200 rounded-lg bg-amber-50/50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-[10px] text-amber-700/70 font-bold uppercase tracking-wider">Deudor Informante</p>
                            <p className="font-bold text-slate-900">{liq.empresa_emisora.nombre}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-amber-700">{formatearDinero(liq.monto)}</p>
                          </div>
                        </div>
                        
                        <div className="mb-4 space-y-2">
                          <a href={liq.url_documento_respaldo} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline font-bold inline-flex items-center gap-1.5 transition-colors">
                            <FileText className="w-4 h-4" /> Ver comprobante bancario
                          </a>
                          <p className="text-xs text-slate-500 italic bg-white p-2 rounded border border-amber-100">{liq.detalle}</p>
                        </div>

                        {session?.user?.empresa_activa === false ? (
                          <div className="w-full text-center text-destructive text-sm font-bold bg-destructive/10 p-2.5 rounded-md border border-destructive/20 flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" /> Acción bloqueada (Solo Lectura)
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <Button 
                              variant="outline"
                              onClick={() => abrirModalRechazo(liq.id)} 
                              disabled={hayProcesamientoActivo} 
                              className="flex-1 font-bold text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                            >
                              Rechazar
                            </Button>
                            <Button 
                              onClick={() => handleAprobarCobro(liq.id)} 
                              disabled={hayProcesamientoActivo} 
                              className="flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {estaQuemando ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Quemando...</>
                              ) : "Validar cobro"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-t-4 border-t-emerald-500">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Saldos a favor remanentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {misCobros.length === 0 ? (
                <p className="text-muted-foreground italic text-sm text-center py-2">No tienes saldos a favor.</p>
              ) : (
                <div className="space-y-3">
                  {misCobros.map((cobro, idx) => (
                    <div key={idx} className="p-3 border-b border-slate-100 last:border-0 flex justify-between items-center">
                      <span className="font-bold text-slate-700 text-sm">{cobro.deudor}</span>
                      <span className="font-black text-emerald-600 text-lg">{formatearDinero(cobro.monto_total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      <Dialog 
        open={!!deudaSeleccionada} 
        onOpenChange={(isOpen) => {
          if (!isOpen && !isSubmittingForm) setDeudaSeleccionada(null);
        }}
      >
        <DialogContent className="sm:max-w-125 p-0 overflow-hidden border-t-4 border-t-primary">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-bold text-slate-900">
                Informar Transferencia Bancaria
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 pt-1">
                Adjunta el comprobante bancario para notificar el pago a <span className="font-bold text-slate-800">{deudaSeleccionada?.acreedor}</span> por <span className="font-bold text-slate-800">{deudaSeleccionada ? formatearDinero(deudaSeleccionada.monto_total) : ""}</span>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitPago} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="referenciaBancaria" className="text-slate-700 font-semibold">Referencia de Transferencia</Label>
                  <Input 
                    type="text" 
                    id="referenciaBancaria"
                    value={referenciaBancaria} 
                    onChange={(e) => setReferenciaBancaria(e.target.value)} 
                    required 
                    placeholder="Ej. TRF-1234567" 
                    disabled={isSubmittingForm} 
                    className="bg-slate-50/50" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="comprobante" className="text-slate-700 font-semibold">Comprobante (Solo PDF)</Label>
                  <Input 
                    type="file" 
                    id="comprobante"
                    accept="application/pdf" 
                    onChange={handleFileChange} 
                    required 
                    disabled={isSubmittingForm} 
                    className="cursor-pointer bg-slate-50/50 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-900 hover:file:bg-slate-300" 
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setDeudaSeleccionada(null)} 
                  disabled={isSubmittingForm}
                  className="font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmittingForm} 
                  className="font-bold shadow-sm w-full sm:w-auto"
                >
                  {isSubmittingForm ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</>
                  ) : "Confirmar y Enviar"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={modalRechazo.isOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen && procesandoId !== modalRechazo.liquidacionId) {
            setModalRechazo({ isOpen: false, liquidacionId: null });
          }
        }}
      >
        <DialogContent className="sm:max-w-112.5 border-t-4 border-t-destructive p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">Rechazar Comprobante</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 pt-2">
              Indique el motivo del rechazo. Esta información será enviada a la empresa deudora para que suba un comprobante válido.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
            <Textarea
              placeholder="Ej: El comprobante está ilegible, la transferencia no impactó..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              disabled={procesandoId === modalRechazo.liquidacionId}
              className="resize-none focus-visible:ring-destructive min-h-30 text-sm bg-slate-50/50"
            />
          </div>
          
          <DialogFooter className="gap-3 sm:gap-0 mt-2">
            <Button 
              variant="ghost" 
              onClick={() => setModalRechazo({ isOpen: false, liquidacionId: null })}
              disabled={procesandoId === modalRechazo.liquidacionId}
              className="font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmarRechazo}
              disabled={procesandoId === modalRechazo.liquidacionId}
              className="font-bold shadow-sm"
            >
              {procesandoId === modalRechazo.liquidacionId ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
              ) : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}