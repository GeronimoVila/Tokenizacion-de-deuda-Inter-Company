"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-medium">Buscando correcciones pendientes...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Bandeja de Correcciones</h1>
      <p className="text-gray-600 mb-6">Revisa los motivos de rechazo, corrige los comprobantes y reenvía las obligaciones a tus contrapartes.</p>

      {mensaje && !deudaEditar && (
        <div className={`p-4 mb-6 rounded-lg ${mensaje.tipo === "error" ? "bg-red-50 text-red-700 border-l-4 border-red-500" : "bg-green-50 text-green-700 border-l-4 border-green-500"}`}>
          {mensaje.texto}
        </div>
      )}

      {rechazadas.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-8 text-center rounded-lg text-gray-500">
          No tienes transacciones devueltas o rechazadas en este momento.
        </div>
      ) : (
        <div className="grid gap-4">
          {rechazadas.map((deuda) => {
            const motivoExtraido = deuda.detalle.split(" | MOTIVO RECHAZO: ")[1] || "Sin motivo especificado por el operador.";
            
            return (
              <div key={deuda.id} className="p-5 rounded-lg shadow-sm border border-red-200 bg-red-50">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wide mb-2 inline-block">Devuelto por contraparte</span>
                    <h3 className="text-xl font-black text-gray-800">Operación #{deuda.id}</h3>
                    <p className="text-sm text-gray-700 mt-1"><strong>Destinatario:</strong> {deuda.empresa_receptora.nombre}</p>
                    <p className="text-sm text-gray-700"><strong>Monto original:</strong> ${Number(deuda.monto).toLocaleString('es-AR')}</p>
                    
                    <div className="mt-3 p-3 bg-white border border-red-100 rounded text-sm text-gray-800">
                      <span className="font-bold text-red-700">Motivo del rechazo:</span> {motivoExtraido}
                    </div>

                    <a href={deuda.url_documento_respaldo} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline mt-3 inline-flex items-center gap-1 font-bold">
                      📄 Revisar PDF Original
                    </a>
                  </div>

                  <div className="flex flex-col justify-center min-w-48">
                    {session?.user?.empresa_activa === false ? (
                      <span className="text-sm text-red-600 font-bold bg-red-100 px-4 py-3 rounded text-center">Solo Lectura</span>
                    ) : (
                      <button
                        onClick={() => abrirEditor(deuda)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors shadow-sm"
                      >
                        Corregir y Reenviar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deudaEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl border-t-4 border-blue-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Corregir Operación #{deudaEditar.id}</h3>
              <button onClick={() => setDeudaEditar(null)} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            
            {mensaje && (
              <div className="p-3 mb-4 rounded bg-red-50 text-red-700 text-sm border-l-4 border-red-500">{mensaje.texto}</div>
            )}

            <form onSubmit={handleReenviar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Monto Corregido ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={nuevoMonto} 
                  onChange={(e) => setNuevoMonto(e.target.value)} 
                  required 
                  disabled={isSubmitting}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nuevo Comprobante PDF (Opcional)</label>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={(e) => setNuevoArchivo(e.target.files ? e.target.files[0] : null)} 
                  disabled={isSubmitting}
                  className="w-full p-2 border border-gray-300 rounded text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                />
                <p className="text-xs text-gray-500 mt-1">Solo sube un archivo si el anterior fue rechazado por ser ilegible o incorrecto.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Detalle / Concepto</label>
                <textarea 
                  value={nuevoDetalle} 
                  onChange={(e) => setNuevoDetalle(e.target.value)} 
                  required 
                  disabled={isSubmitting}
                  className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-blue-500 outline-none" 
                  rows={2}
                ></textarea>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button 
                  type="button"
                  onClick={() => setDeudaEditar(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded font-bold text-white transition-all flex items-center gap-2 ${
                    isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? "Procesando..." : "Confirmar y Reenviar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}