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
      
      setPendientes(data.data.listados.tramites_pendientes);
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las aprobaciones pendientes." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccion = async (deuda: TransaccionDeuda, accion: "aprobar" | "rechazar") => {
    const isLiquidacion = deuda.detalle.includes("Liquidación de Saldo");

    if (accion === "aprobar") {
      const msgConfirmacion = isLiquidacion
        ? "¿El dinero ingresó a tu cuenta bancaria? Al confirmar esto, liquidarás el saldo definitivamente y se quemarán los tokens remanentes en la BFA."
        : "¿Estás seguro de aprobar esta deuda? Esto emitirá un Token en la Blockchain y es irreversible.";
      
      if (!confirm(msgConfirmacion)) return;
    } else {
      if (!confirm("¿Estás seguro de rechazar esta operación?")) return;
    }
    
    setProcesandoId(deuda.id);
    setAccionSeleccionada(accion);
    setMensaje(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const endpoint = accion === "aprobar" ? `${apiUrl}/deudas/${deuda.id}/aprobar` : `${apiUrl}/deudas/${deuda.id}/rechazar`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "",
        },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Error al ${accion} la operación.`);

      if (accion === "aprobar") {
        setMensaje({ 
          tipo: "exito", 
          texto: isLiquidacion 
            ? `¡Cobro #${deuda.id} verificado y tokens liquidados (quemados) en Web3!` 
            : `¡Deuda #${deuda.id} tokenizada (acuñada) con éxito en Web3!` 
        });
      } else {
        setMensaje({ tipo: "exito", texto: `Operación #${deuda.id} rechazada correctamente.` });
      }
      
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
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Bandeja de Aprobación Dual</h1>
      <p className="text-gray-600 mb-6">Operaciones y pagos pendientes de revisión corporativa.</p>

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
          {pendientes.map((deuda) => {
            const isLiquidacion = deuda.detalle.includes("Liquidación de Saldo");

            return (
              <div 
                key={deuda.id} 
                className={`p-5 rounded-lg shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 ${isLiquidacion ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {isLiquidacion ? (
                      <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wide">Validar Pago</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wide">Factura Pendiente</span>
                    )}
                    <span className="text-sm text-gray-500 font-medium">ID Op: #{deuda.id}</span>
                  </div>
                  
                  <h3 className={`text-2xl font-black ${isLiquidacion ? 'text-green-700' : 'text-gray-800'}`}>
                    Monto: ${Number(deuda.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </h3>
                  
                  <div className="mt-2 text-sm text-gray-700">
                    <p><strong>{isLiquidacion ? "Pagador (Quién informa):" : "Acreedor (Quién subió):"}</strong> {deuda.empresa_receptora.nombre}</p>
                    <p><strong>{isLiquidacion ? "Receptor (Vos):" : "Deudor (Vos):"}</strong> {deuda.empresa_emisora.nombre}</p>
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-2 bg-white/50 p-2 rounded"><em>Detalle: {deuda.detalle}</em></p>
                  
                  <a 
                    href={deuda.url_documento_respaldo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline mt-3 inline-flex items-center gap-1 font-bold"
                  >
                    📄 {isLiquidacion ? "Ver Comprobante de Transferencia" : "Ver PDF Respaldatorio (IPFS)"}
                  </a>
                </div>

                <div className="flex flex-col gap-2 min-w-50">
                  {deuda.empresa_emisora.id === session?.user?.empresa_id ? (
                    <>
                      <button
                        onClick={() => handleAccion(deuda, "aprobar")}
                        disabled={procesandoId === deuda.id}
                        className={`w-full px-4 py-3 rounded font-bold text-white shadow-sm transition-all ${
                          procesandoId === deuda.id 
                            ? (isLiquidacion ? "bg-green-400 cursor-wait" : "bg-blue-400 cursor-wait") 
                            : (isLiquidacion ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700")
                        }`}
                      >
                        {procesandoId === deuda.id && accionSeleccionada === "aprobar" 
                          ? (isLiquidacion ? "🔥 Quemando Web3..." : "Cargando...") 
                          : (isLiquidacion ? "Verificar Cobro" : "Aprobar (Minting)")}
                      </button>
                      
                      <button
                        onClick={() => handleAccion(deuda, "rechazar")}
                        disabled={procesandoId === deuda.id}
                        className={`w-full px-4 py-2 rounded font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 transition ${procesandoId === deuda.id && "opacity-50 cursor-not-allowed"}`}
                      >
                        {procesandoId === deuda.id && accionSeleccionada === "rechazar" ? "Rechazando..." : "Rechazar Comprobante"}
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500 italic bg-gray-100 px-4 py-3 rounded border text-center">Esperando contraparte</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}