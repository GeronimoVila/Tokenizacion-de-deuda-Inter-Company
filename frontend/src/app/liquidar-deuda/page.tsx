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

  return (
    <div className="max-w-6xl mx-auto p-6 relative">
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
        <div className="text-center p-8 text-gray-500 font-medium animate-pulse">Sincronizando estado de cuenta con la Blockchain...</div>
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
                    
                    {session?.user?.empresa_activa === false ? (
                      <div className="w-full mt-2 text-center text-red-600 text-sm font-bold bg-red-50 p-2 rounded border border-red-200">
                        Acción bloqueada (Baja Lógica)
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeudaSeleccionada(deuda)} 
                        disabled={hayProcesamientoActivo}
                        className={`w-full mt-2 border text-sm font-semibold py-2 px-4 rounded shadow-sm transition-all ${
                          hayProcesamientoActivo 
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-white border-gray-300 text-gray-700 hover:text-blue-600'
                        }`}
                      >
                        Informar Transferencia Bancaria
                      </button>
                    )}
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
                  {pagosRecibidos.map((liq) => {
                    const esElProcesado = procesandoId === liq.id;
                    const estaQuemando = esElProcesado && tipoAccion === "aprobar";
                    const estaRechazando = esElProcesado && tipoAccion === "rechazar";

                    return (
                      <div key={liq.id} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                        <div className="flex justify-between items-start mb-2">
                          <div><p className="text-xs text-gray-500 font-bold uppercase">Deudor informante</p><p className="font-bold text-gray-800">{liq.empresa_emisora.nombre}</p></div>
                          <div className="text-right"><p className="text-xl font-black text-yellow-700">${Number(liq.monto).toLocaleString('es-AR')}</p></div>
                        </div>
                        <div className="mb-3">
                          <a href={liq.url_documento_respaldo} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline font-medium inline-flex items-center gap-1">📄 Ver Comprobante Bancario</a>
                          <p className="text-xs text-gray-500 mt-1 italic">{liq.detalle}</p>
                        </div>

                        {session?.user?.empresa_activa === false ? (
                          <div className="w-full text-center text-red-600 text-sm font-bold bg-red-50 p-2 rounded border border-red-200">
                            Acción bloqueada (Solo Lectura)
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => abrirModalRechazo(liq.id)} 
                              disabled={hayProcesamientoActivo} 
                              className={`flex-1 border py-2 rounded font-bold text-sm transition-all ${
                                hayProcesamientoActivo 
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                  : 'bg-white border-red-300 text-red-600 hover:bg-red-50'
                              }`}
                            >
                              Rechazar
                            </button>
                            <button 
                              onClick={() => handleAprobarCobro(liq.id)} 
                              disabled={hayProcesamientoActivo} 
                              className={`flex-1 py-2 rounded font-bold text-sm text-white transition-all flex justify-center items-center gap-2 ${
                                hayProcesamientoActivo 
                                  ? 'bg-gray-400 cursor-not-allowed' 
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              {estaQuemando ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  ⏳ Quemando en BFA...
                                </>
                              ) : "Validar Cobro"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
            <h3 className="text-xl font-bold">Cargar Comprobante Bancario</h3>
            <button onClick={() => setDeudaSeleccionada(null)} disabled={isSubmittingForm} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
          </div>
          <form onSubmit={handleSubmitPago} className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Referencia</label>
              <input type="text" value={referenciaBancaria} onChange={(e) => setReferenciaBancaria(e.target.value)} required placeholder="Ej. TRF-1234567" disabled={isSubmittingForm} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Comprobante (PDF)</label>
              <input type="file" accept="application/pdf" onChange={handleFileChange} required disabled={isSubmittingForm} className="w-full p-2 border rounded file:bg-blue-50 file:text-blue-700 disabled:bg-gray-100" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={isSubmittingForm} className={`w-full py-3 rounded font-bold text-white transition-all flex justify-center items-center gap-2 ${isSubmittingForm ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSubmittingForm ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Subiendo Comprobante...
                  </>
                ) : "Confirmar y Enviar Comprobante"}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalRechazo.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md border-t-4 border-red-500">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Rechazar Comprobante Bancario</h3>
            <p className="text-sm text-gray-600 mb-4">Indique el motivo del rechazo. Esta información será enviada a la empresa deudora para que suba un comprobante válido.</p>
            
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 mb-4 resize-none outline-none"
              rows={4}
              placeholder="Ej: El comprobante está ilegible, la transferencia no impactó..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              disabled={procesandoId === modalRechazo.liquidacionId}
            ></textarea>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setModalRechazo({ isOpen: false, liquidacionId: null })}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded transition-colors"
                disabled={procesandoId === modalRechazo.liquidacionId}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarRechazo}
                className={`px-4 py-2 rounded font-bold text-white transition-colors ${
                  procesandoId === modalRechazo.liquidacionId ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={procesandoId === modalRechazo.liquidacionId}
              >
                {procesandoId === modalRechazo.liquidacionId ? "Procesando..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}