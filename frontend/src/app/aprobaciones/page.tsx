"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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

  if (isLoading) return <div className="p-8 text-center text-gray-600">Cargando operaciones pendientes...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 relative">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Bandeja de Aprobación Dual</h1>
      <p className="text-gray-600 mb-6">Operaciones y remitos pendientes de revisión corporativa.</p>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${mensaje.tipo === "error" ? "bg-red-50 text-red-700 border-l-4 border-red-500" : "bg-green-50 text-green-700 border-l-4 border-green-500"}`}>
          {mensaje.texto}
        </div>
      )}

      {pendientes.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-8 text-center rounded-lg text-gray-500">
          No hay operaciones pendientes de aprobación en este momento.
        </div>
      ) : (
        <div className="grid gap-4">
          {pendientes.map((deuda) => (
            <div key={deuda.id} className="p-5 rounded-lg shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 bg-white border-gray-200">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wide">Factura Pendiente</span>
                  <span className="text-sm text-gray-500 font-medium">ID Op: #{deuda.id}</span>
                </div>
                
                <h3 className="text-2xl font-black text-gray-800">
                  Monto: ${Number(deuda.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </h3>
                
                <div className="mt-2 text-sm text-gray-700">
                  <p><strong>Acreedor (Quién subió):</strong> {deuda.empresa_emisora.nombre}</p>
                  <p><strong>Deudor (Vos):</strong> {deuda.empresa_receptora.nombre}</p>
                </div>
                
                <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded"><em>Detalle: {deuda.detalle}</em></p>
                
                <a href={deuda.url_documento_respaldo} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline mt-3 inline-flex items-center gap-1 font-bold">
                  📄 Ver PDF Respaldatorio (IPFS)
                </a>
              </div>

              <div className="flex flex-col gap-2 min-w-50">
                {deuda.empresa_receptora.id === session?.user?.empresa_id ? (
                  session?.user?.empresa_activa === false ? (
                    <span className="text-sm text-red-600 font-bold bg-red-50 px-4 py-3 rounded border border-red-200 text-center">
                      Subsidiaria Inactiva (Solo lectura)
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAprobar(deuda)}
                        disabled={procesandoId === deuda.id}
                        className={`w-full px-4 py-3 rounded font-bold text-white shadow-sm transition-all ${
                          procesandoId === deuda.id ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {procesandoId === deuda.id && accionSeleccionada === "aprobar" ? "Cargando..." : "Aprobar (Minting)"}
                      </button>
                      
                      <button
                        onClick={() => abrirModalRechazo(deuda.id)}
                        disabled={procesandoId === deuda.id}
                        className={`w-full px-4 py-2 rounded font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 transition ${procesandoId === deuda.id && "opacity-50 cursor-not-allowed"}`}
                      >
                        Rechazar Comprobante
                      </button>
                    </>
                  )
                ) : (
                  <span className="text-sm text-gray-500 italic bg-gray-100 px-4 py-3 rounded border text-center">Esperando contraparte</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalRechazo.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md border-t-4 border-red-500">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Rechazar Operación</h3>
            <p className="text-sm text-gray-600 mb-4">Indique el motivo del rechazo. Esta información será enviada a la empresa emisora para que corrija la carga.</p>
            
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 mb-4 resize-none outline-none"
              rows={4}
              placeholder="Ej: El monto en el PDF no coincide con lo declarado..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              disabled={procesandoId === modalRechazo.deudaId}
            ></textarea>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setModalRechazo({ isOpen: false, deudaId: null })}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded transition-colors"
                disabled={procesandoId === modalRechazo.deudaId}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarRechazo}
                className={`px-4 py-2 rounded font-bold text-white transition-colors ${
                  procesandoId === modalRechazo.deudaId ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={procesandoId === modalRechazo.deudaId}
              >
                {procesandoId === modalRechazo.deudaId ? "Procesando..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}