"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Empresa {
  id: number;
  nombre: string;
  wallet_address: string | null;
}

interface TransaccionDeuda {
  id: number;
  monto: number;
  detalle: string;
  estado_validacion: string;
  url_documento_respaldo: string;
  empresa_emisora: Empresa;
  empresa_receptora: Empresa;
}

export default function AprobacionesPage() {
  const { data: session } = useSession();
  const [pendientes, setPendientes] = useState<TransaccionDeuda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [accionSeleccionada, setAccionSeleccionada] = useState<"aprobar" | "rechazar" | null>(null);
  
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito", texto: string } | null>(null);
  const [modalRechazo, setModalRechazo] = useState<{ isOpen: boolean; deudaId: number | null }>({ isOpen: false, deudaId: null });
  const [motivoRechazo, setMotivoRechazo] = useState("");

  useEffect(() => {
    if (session?.user?.email) {
      cargarPendientes();
    }
  }, [session]);

  const cargarPendientes = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/deudas/dashboard`, {
        headers: { "x-user-email": session?.user?.email || "" },
      });
      
      if (!res.ok) throw new Error("Error al obtener las deudas pendientes");
      const data = await res.json();
      
      const facturasNuevas = data.data.listados.tramites_pendientes.filter(
        (p: TransaccionDeuda) => !p.detalle.includes("Liquidación de Saldo")
      );
      
      setPendientes(facturasNuevas);
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las aprobaciones pendientes." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAprobar = async (deuda: TransaccionDeuda) => {
    if (!confirm("¿Estás seguro de aprobar esta deuda? Esto emitirá un Token en la Blockchain y es irreversible.")) return;
    
    setProcesandoId(deuda.id);
    setAccionSeleccionada("aprobar");
    setMensaje(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/deudas/${deuda.id}/aprobar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "",
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al aprobar la operación.");

      setMensaje({ tipo: "exito", texto: `¡Deuda #${deuda.id} tokenizada (acuñada) con éxito en Web3!` });
      cargarPendientes(); 
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setProcesandoId(null);
      setAccionSeleccionada(null);
    }
  };

  const abrirModalRechazo = (id: number) => {
    setModalRechazo({ isOpen: true, deudaId: id });
    setMotivoRechazo("");
  };

  const confirmarRechazo = async () => {
    if (!modalRechazo.deudaId || !motivoRechazo.trim()) {
      setMensaje({ tipo: "error", texto: "Debe proporcionar un motivo de rechazo válido para el emisor." });
      setModalRechazo({ isOpen: false, deudaId: null });
      return;
    }
    
    setProcesandoId(modalRechazo.deudaId);
    setAccionSeleccionada("rechazar");
    setMensaje(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/deudas/${modalRechazo.deudaId}/rechazar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "",
        },
        body: JSON.stringify({ motivoRechazo }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al rechazar la operación.");

      setMensaje({ tipo: "exito", texto: `Operación #${modalRechazo.deudaId} rechazada. Se notificará a la empresa emisora.` });
      setModalRechazo({ isOpen: false, deudaId: null });
      cargarPendientes(); 
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setProcesandoId(null);
      setAccionSeleccionada(null);
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
      <div className="flex h-full min-h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="font-medium text-sm tracking-wide">Cargando operaciones pendientes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 bg-background min-h-screen font-sans">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-2">Bandeja de aprobación dual</h1>
        <p className="text-sm text-slate-500">Operaciones y remitos pendientes de revisión corporativa.</p>
      </div>

      {mensaje && (
        <Alert 
          variant={mensaje.tipo === "error" ? "destructive" : "default"} 
          className={`mb-6 shadow-sm ${mensaje.tipo === "exito" ? "bg-emerald-50 text-emerald-900 border-emerald-200" : ""}`}
        >
          {mensaje.tipo === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          <AlertTitle className="font-bold">
            {mensaje.tipo === "error" ? "Atención" : "Confirmación"}
          </AlertTitle>
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      {pendientes.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-slate-400">
            <CheckCircle2 className="h-12 w-12 mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">Bandeja limpia</h3>
            <p className="text-sm mt-1 text-slate-500 text-center">No hay operaciones pendientes de aprobación en este momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendientes.map((deuda) => (
            <Card key={deuda.id} className="shadow-sm border-slate-200 overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold uppercase tracking-widest text-[10px] px-2.5 py-0.5">
                        Factura Pendiente
                      </Badge>
                      <span className="text-sm font-semibold text-slate-500">ID Op: #{deuda.id}</span>
                    </div>
                    
                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                      Monto: {formatearDinero(deuda.monto)}
                    </h3>
                    
                    <div className="text-sm text-slate-700 space-y-1.5 pt-2">
                      <p><span className="font-semibold text-slate-900">Acreedor:</span> {deuda.empresa_emisora.nombre}</p>
                      <p><span className="font-semibold text-slate-900">Deudor:</span> {deuda.empresa_receptora.nombre}</p>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg text-sm text-slate-600 italic">
                      Detalle: {deuda.detalle}
                    </div>
                    
                    <div className="pt-1">
                      <a 
                        href={deuda.url_documento_respaldo} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center text-sm font-bold text-primary hover:underline hover:text-primary/80 transition-colors"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ver PDF de respaldo
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 min-w-60 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
                    {deuda.empresa_receptora.id === session?.user?.empresa_id ? (
                      session?.user?.empresa_activa === false ? (
                        <div className="bg-destructive/10 text-destructive text-sm font-bold px-4 py-3 rounded-md border border-destructive/20 text-center">
                          Subsidiaria Inactiva (Solo lectura)
                        </div>
                      ) : (
                        <>
                          <Button 
                            onClick={() => handleAprobar(deuda)}
                            disabled={procesandoId === deuda.id}
                            className="w-full font-bold shadow-sm h-12 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {procesandoId === deuda.id && accionSeleccionada === "aprobar" ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                            ) : (
                              "Aprobar (Minting)"
                            )}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => abrirModalRechazo(deuda.id)}
                            disabled={procesandoId === deuda.id}
                            className="w-full font-bold text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 h-12 text-sm transition-colors"
                          >
                            Rechazar comprobante
                          </Button>
                        </>
                      )
                    ) : (
                      <div className="bg-slate-100 text-slate-500 text-sm font-semibold px-4 py-3 rounded-md border border-slate-200 text-center flex items-center justify-center italic h-12">
                        Esperando contraparte
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog 
        open={modalRechazo.isOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen && procesandoId !== modalRechazo.deudaId) {
            setModalRechazo({ isOpen: false, deudaId: null });
          }
        }}
      >
        <DialogContent className="sm:max-w-112.5 border-t-4 border-t-destructive p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">Rechazar Operación</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 pt-2">
              Indique el motivo del rechazo. Esta información será enviada a la empresa emisora para que corrija la carga.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
            <Textarea
              placeholder="Ej: El monto en el PDF no coincide con lo declarado..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              disabled={procesandoId === modalRechazo.deudaId}
              className="resize-none focus-visible:ring-destructive min-h-30 text-sm"
            />
          </div>
          
          <DialogFooter className="gap-3 sm:gap-0 mt-2">
            <Button 
              variant="ghost" 
              onClick={() => setModalRechazo({ isOpen: false, deudaId: null })}
              disabled={procesandoId === modalRechazo.deudaId}
              className="font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmarRechazo}
              disabled={procesandoId === modalRechazo.deudaId}
              className="font-bold shadow-sm"
            >
              {procesandoId === modalRechazo.deudaId ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
              ) : (
                "Confirmar Rechazo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}