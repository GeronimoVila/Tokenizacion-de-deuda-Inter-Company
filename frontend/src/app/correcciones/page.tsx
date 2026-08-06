"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertCircle, CheckCircle2, Loader2, FileText, FileEdit, RefreshCw, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Empresa {
  id: number;
  nombre: string;
}

interface TransaccionDeuda {
  id: number;
  monto: number;
  detalle: string;
  url_documento_respaldo: string;
  empresa_receptora: Empresa;
}

export default function CorreccionesPage() {
  const { data: session } = useSession();
  const [rechazadas, setRechazadas] = useState<TransaccionDeuda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deudaEditar, setDeudaEditar] = useState<TransaccionDeuda | null>(null);
  const [nuevoMonto, setNuevoMonto] = useState("");
  const [nuevoDetalle, setNuevoDetalle] = useState("");
  const [nuevoArchivo, setNuevoArchivo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito", texto: string } | null>(null);

  useEffect(() => {
    if (session?.user?.email) cargarRechazadas();
  }, [session]);

  const cargarRechazadas = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/deudas/dashboard`, {
        headers: { "x-user-email": session?.user?.email || "" },
      });
      
      if (!res.ok) throw new Error("Error obteniendo datos.");
      const data = await res.json();
      
      const misDeudasRechazadas = data.data.listados.tramites_pendientes.filter(
        (p: any) => p.estado_validacion === "RECHAZADA" && p.empresa_emisora_id === session?.user?.empresa_id
      );
      
      setRechazadas(misDeudasRechazadas);
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las operaciones rechazadas." });
    } finally {
      setIsLoading(false);
    }
  };

  const abrirEditor = (deuda: TransaccionDeuda) => {
    setDeudaEditar(deuda);
    setNuevoMonto(deuda.monto.toString());
    setNuevoDetalle(deuda.detalle.split(" | MOTIVO RECHAZO: ")[0]);
    setNuevoArchivo(null);
    setMensaje(null);
  };

  const handleReenviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deudaEditar) return;
    setIsSubmitting(true);
    setMensaje(null);

    try {
      const formData = new FormData();
      formData.append("monto", nuevoMonto);
      formData.append("detalle", nuevoDetalle);
      if (nuevoArchivo) {
        formData.append("comprobante", nuevoArchivo);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/deudas/${deudaEditar.id}/reenviar`, {
        method: "POST",
        headers: { "x-user-email": session?.user?.email || "" },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reenviar la operación.");

      setMensaje({ tipo: "exito", texto: "Operación corregida y enviada nuevamente a la contraparte." });
      setDeudaEditar(null);
      cargarRechazadas();
    } catch (error: any) {
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setIsSubmitting(false);
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
          <div className="font-medium text-sm tracking-wide">Buscando correcciones pendientes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 bg-background min-h-screen font-sans">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-2">Bandeja de correcciones</h1>
        <p className="text-sm text-slate-500">Revisa los motivos de rechazo, corrige los comprobantes y reenvía las obligaciones a tus contrapartes.</p>
      </div>

      {mensaje && !deudaEditar && (
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
            {mensaje.tipo === "error" ? "Atención" : "Operación Exitosa"}
          </AlertTitle>
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      {rechazadas.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-slate-400">
            <CheckCircle2 className="h-12 w-12 mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">Bandeja limpia</h3>
            <p className="text-sm mt-1 text-slate-500 text-center">No tienes transacciones devueltas o rechazadas en este momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {rechazadas.map((deuda) => {
            const motivoExtraido = deuda.detalle.split(" | MOTIVO RECHAZO: ")[1] || "Sin motivo especificado por el operador.";
            
            return (
              <Card key={deuda.id} className="shadow-sm border-destructive/20 bg-destructive/5 overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive" className="font-bold uppercase tracking-widest text-[10px] px-2.5 py-0.5">
                          Devuelto por contraparte
                        </Badge>
                      </div>
                      
                      <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Operación #{deuda.id}
                      </h3>
                      
                      <div className="text-sm text-slate-700 space-y-1.5 pt-1">
                        <p><span className="font-semibold text-slate-900">Destinatario:</span> {deuda.empresa_receptora.nombre}</p>
                        <p><span className="font-semibold text-slate-900">Monto original:</span> {formatearDinero(deuda.monto)}</p>
                      </div>

                      <Alert variant="destructive" className="bg-background border-destructive/20 mt-4">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle className="font-bold text-sm">Motivo del rechazo</AlertTitle>
                        <AlertDescription className="text-sm mt-1 text-slate-700">
                          {motivoExtraido}
                        </AlertDescription>
                      </Alert>
                      
                      <div className="pt-2">
                        <a 
                          href={deuda.url_documento_respaldo} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center text-sm font-bold text-slate-600 hover:underline hover:text-slate-900 transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Revisar PDF original
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-60 justify-center border-t md:border-t-0 md:border-l border-destructive/10 pt-6 md:pt-0 md:pl-8">
                      {session?.user?.empresa_activa === false ? (
                        <div className="bg-destructive/10 text-destructive text-sm font-bold px-4 py-3 rounded-md border border-destructive/20 text-center">
                          Subsidiaria Inactiva (Solo lectura)
                        </div>
                      ) : (
                        <Button 
                          onClick={() => abrirEditor(deuda)}
                          variant="destructive"
                          className="w-full font-bold shadow-sm h-12 text-sm"
                        >
                          <FileEdit className="w-4 h-4 mr-2" />
                          Corregir y reenviar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog 
        open={!!deudaEditar} 
        onOpenChange={(isOpen) => {
          if (!isOpen && !isSubmitting) setDeudaEditar(null);
        }}
      >
        <DialogContent className="sm:max-w-150 p-0 overflow-hidden border-t-4 border-t-primary">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-bold text-slate-900">
                Corregir Operación #{deudaEditar?.id}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 pt-1">
                Ajusta los montos, el concepto o adjunta un nuevo comprobante para subsanar el rechazo.
              </DialogDescription>
            </DialogHeader>

            {mensaje && deudaEditar && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold">Error de validación</AlertTitle>
                <AlertDescription>{mensaje.texto}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleReenviar} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nuevoMonto" className="text-slate-700 font-semibold">Monto Corregido (ARS)</Label>
                  <Input
                    type="number"
                    id="nuevoMonto"
                    step="0.01"
                    min="0.01"
                    value={nuevoMonto}
                    onChange={(e) => setNuevoMonto(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="font-mono bg-slate-50/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nuevoArchivo" className="text-slate-700 font-semibold">Nuevo Comprobante (Opcional)</Label>
                  <Input
                    type="file"
                    id="nuevoArchivo"
                    accept="application/pdf"
                    onChange={(e) => setNuevoArchivo(e.target.files ? e.target.files[0] : null)}
                    disabled={isSubmitting}
                    className="cursor-pointer bg-slate-50/50 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-900 hover:file:bg-slate-300"
                  />
                  <p className="text-[11px] text-muted-foreground pt-1">Sube un PDF solo si el anterior fue rechazado por ilegibilidad.</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nuevoDetalle" className="text-slate-700 font-semibold">Detalle / Concepto</Label>
                  <Textarea
                    id="nuevoDetalle"
                    value={nuevoDetalle}
                    onChange={(e) => setNuevoDetalle(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="resize-none min-h-20 bg-slate-50/50"
                  />
                </div>
              </div>

              <DialogFooter className="gap-3 sm:gap-0 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeudaEditar(null)}
                  disabled={isSubmitting}
                  className="font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-bold shadow-sm"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Confirmar y reenviar</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}