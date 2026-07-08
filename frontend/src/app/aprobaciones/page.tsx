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
  
  // CORRECCIÓN: Agregamos el estado para saber qué acción se está ejecutando
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

  const handleAccion = async (id: number, accion: "aprobar" | "rechazar") => {
    if (accion === "aprobar") {
      if (!confirm("¿Estás seguro de aprobar esta deuda? Esto emitirá un Token en la Blockchain y es irreversible.")) return;
    } else {
      if (!confirm("¿Estás seguro de rechazar esta operación?")) return;
    }
    
    // Seteamos ambos estados al iniciar la petición
    setProcesandoId(id);
    setAccionSeleccionada(accion);
    setMensaje(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const endpoint = accion === "aprobar" ? `${apiUrl}/deudas/${id}/aprobar` : `${apiUrl}/deudas/${id}/rechazar`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "",
        },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Error al ${accion} la deuda.`);

      if (accion === "aprobar") {
        setMensaje({ tipo: "exito", texto: `¡Deuda #${id} tokenizada con éxito en Web3!` });
      } else {
        setMensaje({ tipo: "exito", texto: `Deuda #${id} rechazada correctamente.` });
      }
      
      cargarPendientes(); 
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      // Limpiamos los estados al terminar
      setProcesandoId(null);
      setAccionSeleccionada(null);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-600">Cargando operaciones pendientes...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Bandeja de Aprobación Dual</h1>
      <p className="text-gray-600 mb-6">Operaciones pendientes de revisión para Tokenización.</p>

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
            <div key={deuda.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-semibold">Pendiente</span>
                  <span className="text-sm text-gray-500">ID Op: #{deuda.id}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Monto: ${deuda.monto}</h3>
                <p className="text-sm text-gray-600"><strong>Acreedor (Quién subió):</strong> {deuda.empresa_receptora.nombre}</p>
                <p className="text-sm text-gray-600"><strong>Deudor (Vos):</strong> {deuda.empresa_emisora.nombre}</p>
                <p className="text-sm text-gray-500 mt-1"><em>Concepto: {deuda.detalle}</em></p>
                
                <a 
                  href={deuda.url_documento_respaldo} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm hover:underline mt-2 inline-flex items-center gap-1 font-medium"
                >
                  📄 Ver PDF Respaldatorio (IPFS)
                </a>
              </div>

              <div className="flex gap-2">
                {deuda.empresa_emisora.id === session?.user?.empresa_id ? (
                  <>
                    <button
                      onClick={() => handleAccion(deuda.id, "rechazar")}
                      disabled={procesandoId === deuda.id}
                      className={`px-4 py-2 rounded font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition ${procesandoId === deuda.id && "opacity-50 cursor-not-allowed"}`}
                    >
                      {procesandoId === deuda.id && accionSeleccionada === "rechazar" ? "Rechazando..." : "Rechazar"}
                    </button>
                    <button
                      onClick={() => handleAccion(deuda.id, "aprobar")}
                      disabled={procesandoId === deuda.id}
                      className={`px-4 py-2 rounded font-medium text-white shadow-sm transition ${procesandoId === deuda.id ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      {procesandoId === deuda.id && accionSeleccionada === "aprobar" ? "Cargando..." : "Aprobar (Minting)"}
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border">Esperando a tu contraparte</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}