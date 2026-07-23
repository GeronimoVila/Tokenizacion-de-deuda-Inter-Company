"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);

  const [deudaSeleccionada, setDeudaSeleccionada] = useState<SaldoGlobal | null>(null);
  const [referenciaBancaria, setReferenciaBancaria] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

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

    setIsSubmitting(true);
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
        headers: { "x-user-email": session.user.email || "" },
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
      setIsSubmitting(false);
    }
  };

  const handleAccionCobro = async (id: number, accion: "aprobar" | "rechazar") => {
    if (!confirm(accion === "aprobar" ? "¿El dinero ingresó a tu cuenta bancaria? Esto quemará los tokens remanentes." : "¿Rechazar comprobante?")) return;
    setIsSubmitting(true);
    setMensaje(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/deudas/${id}/${accion}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": session?.user?.email || "" },
      });

      if (!res.ok) throw new Error(`Error al ${accion} el pago.`);
      setMensaje({ tipo: "exito", texto: accion === "aprobar" ? "¡Cobro verificado y Tokens liquidados!" : "Pago rechazado." });
      cargarDatos();
    } catch (error: any) {
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">Liquidación de Saldos Remanentes</h1>
        <p className="text-gray-600 mt-2">Informa tus pagos físicos únicamente para las deudas unilaterales que queden luego del Netting.</p>
      </div>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${mensaje.tipo === "error" ? "bg-red-50 text-red-700 border-l-4 border-red-500" : "bg-green-50 text-green-700 border-l-4 border-green-500"}`}>
          {mensaje.texto}
        </div>
      )}

      {isLoading ? (
        <div className="text-center p-8 text-gray-500">Sincronizando estado de cuenta y banco...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2"><span>🔴</span> Deudas Pendientes de Pago</h2>
            {misDeudas.length === 0 ? <p className="text-gray-500 italic text-sm">No tienes deudas activas.</p> : (
              <div className="space-y-4">
                {deudasBloqueadas.map((deuda, idx) => (
                  <div key={`bloq-${idx}`} className="p-4 border border-orange-200 rounded-lg bg-orange-50 opacity-80">
                    <div className="flex justify-between mb-2">
                      <div><p className="text-xs text-orange-600 font-bold uppercase">Acreedor</p><p className="font-bold text-gray-800">{deuda.acreedor}</p></div>
                      <div className="text-right"><p className="text-xl font-black text-red-500">${Number(deuda.monto_total).toLocaleString('es-AR')}</p></div>
                    </div>
                    <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-800 font-medium">⚠️ Tienes saldos cruzados con esta empresa. Ejecuta el Netting primero.</div>
                  </div>
                ))}

                {deudasParaLiquidar.map((deuda, idx) => (
                  <div key={`liq-${idx}`} className="p-4 border rounded-lg border-gray-200 bg-gray-50">
                    <div className="flex justify-between mb-2">
                      <div><p className="text-xs text-gray-500 font-bold uppercase">Acreedor</p><p className="font-bold text-gray-800">{deuda.acreedor}</p></div>
                      <div className="text-right"><p className="text-xl font-black text-red-600">${Number(deuda.monto_total).toLocaleString('es-AR')}</p></div>
                    </div>
                    <button onClick={() => setDeudaSeleccionada(deuda)} className="w-full mt-2 bg-white border border-gray-300 text-gray-700 hover:text-blue-600 font-semibold py-2 px-4 rounded shadow-sm text-sm">Informar Transferencia Bancaria</button>
                  </div>
                ))}
              </div>
            )}

            {pagosEnviados.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Pagos Informados (Esperando Confirmación)</h3>
                <div className="space-y-3">
                  {pagosEnviados.map(liq => (
                    <div key={liq.id} className="p-3 bg-gray-100 rounded text-sm flex justify-between border border-gray-200">
                      <span>A: <strong>{liq.empresa_receptora.nombre}</strong></span>
                      <span className="text-gray-500 italic">⏳ Pendiente</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-t-yellow-500 border border-gray-200">
              <h2 className="text-xl font-bold text-yellow-700 mb-4 flex items-center gap-2"><span>⚠️</span> Validar Pagos Recibidos</h2>
              {pagosRecibidos.length === 0 ? <p className="text-gray-500 italic text-sm">No hay transferencias pendientes de validación.</p> : (
                <div className="space-y-4">
                  {pagosRecibidos.map((liq) => (
                    <div key={liq.id} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                      <div className="flex justify-between items-start mb-2">
                        <div><p className="text-xs text-gray-500 font-bold uppercase">Deudor informante</p><p className="font-bold text-gray-800">{liq.empresa_emisora.nombre}</p></div>
                        <div className="text-right"><p className="text-xl font-black text-yellow-700">${Number(liq.monto).toLocaleString('es-AR')}</p></div>
                      </div>
                      <div className="mb-3">
                        <a href={liq.url_documento_respaldo} target="_blank" className="text-blue-600 text-sm hover:underline font-medium inline-flex items-center gap-1">📄 Ver Comprobante Bancario</a>
                        <p className="text-xs text-gray-500 mt-1 italic">{liq.detalle}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAccionCobro(liq.id, "rechazar")} disabled={isSubmitting} className="flex-1 bg-white border border-red-300 text-red-600 py-2 rounded font-bold text-sm">Rechazar</button>
                        <button onClick={() => handleAccionCobro(liq.id, "aprobar")} disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold text-sm">Verificar Cobro</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2"><span>🟢</span> Saldos a Favor Remanentes</h2>
              {misCobros.length === 0 ? <p className="text-gray-500 italic text-sm">No tienes saldos a favor.</p> : (
                <div className="space-y-3">
                  {misCobros.map((cobro, idx) => (
                    <div key={idx} className="p-3 border-b border-gray-100 last:border-0 flex justify-between">
                      <span className="font-bold text-gray-700">{cobro.deudor}</span>
                      <span className="font-black text-green-600">${Number(cobro.monto_total).toLocaleString('es-AR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deudaSeleccionada && (
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-600 mt-4 animate-fade-in-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Cargar Comprobante</h3>
            <button onClick={() => setDeudaSeleccionada(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
          </div>
          <form onSubmit={handleSubmitPago} className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Referencia</label>
              <input type="text" value={referenciaBancaria} onChange={(e) => setReferenciaBancaria(e.target.value)} required placeholder="Ej. TRF-1234567" className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Comprobante (PDF)</label>
              <input type="file" accept="application/pdf" onChange={handleFileChange} required className="w-full p-2 border rounded file:bg-blue-50 file:text-blue-700" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={isSubmitting} className={`w-full py-3 rounded font-bold text-white ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSubmitting ? "Subiendo..." : "Confirmar y Enviar Comprobante"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}