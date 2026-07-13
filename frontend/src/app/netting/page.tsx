"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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
      `¿Confirma la compensación (quema) por $${oportunidad.montoACompensar} entre ${oportunidad.empresaA.nombre} y ${oportunidad.empresaB.nombre}?`
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
        texto: `¡Compensación exitosa! Se cruzaron saldos por $${oportunidad.montoACompensar} y los pagarés fueron actualizados en la Blockchain.` 
      });
      
      cargarOportunidades();
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setProcesando(null);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-600">Calculando saldos cruzados y balances del Holding...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Motor de Compensación (Netting)</h1>
          <p className="text-gray-600 mt-1">Cruce automatizado de saldos para optimización de liquidez inter-company.</p>
        </div>
        <button 
          onClick={cargarOportunidades}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded shadow-sm text-sm font-medium border border-gray-300"
        >
          🔄 Recalcular
        </button>
      </div>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${mensaje.tipo === "error" ? "bg-red-50 text-red-700 border-l-4 border-red-500" : "bg-green-50 text-green-700 border-l-4 border-green-500"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* SECCIÓN 1: Tarjetas de Netting Operativo */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">Oportunidades de Cruce Detectadas</h2>
      {oportunidades.length === 0 ? (
        <div className="bg-white border border-gray-200 p-8 text-center rounded-xl shadow-sm mb-8">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Cuentas Cruzadas Optimizadas</h3>
          <p className="text-gray-500 text-sm">El algoritmo no detecta deudas cruzadas compensables en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-6 mb-8">
          {oportunidades.map((op, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md border-t-4 border-t-blue-600 overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-100">
                <div className="flex-1">
                  <span className="text-xs font-bold tracking-wider text-blue-600 uppercase mb-2 block">Cruce Detectado</span>
                  <div className="flex items-center gap-4 text-xl font-medium text-gray-800">
                    <span className="bg-gray-100 px-3 py-1 rounded text-sm font-semibold">{op.empresaA.nombre}</span>
                    <span className="text-gray-400">⟷</span>
                    <span className="bg-gray-100 px-3 py-1 rounded text-sm font-semibold">{op.empresaB.nombre}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Monto a Compensar (Ahorro)</p>
                  <p className="text-3xl font-black text-green-600">
                    $ {Number(op.montoACompensar).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-6 flex flex-col md:flex-row gap-8 text-sm">
                {/* Deuda A hacia B */}
                <div className="flex-1 bg-white p-4 rounded border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-gray-800 border-b pb-2 mb-3">Deuda de {op.empresaA.nombre}</h4>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Deuda Bruta Acumulada:</span>
                    <span className="font-semibold text-red-600">${Number(op.deudaBruta_A_hacia_B).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">A cancelar por Netting:</span>
                    <span className="font-semibold text-green-600">- ${Number(op.montoACompensar).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between mt-3 pt-2 border-t font-bold">
                    <span>Saldo Remanente a Pagar:</span>
                    <span className={Number(op.saldoNetoFinal_A_hacia_B) > 0 ? "text-orange-600" : "text-gray-500"}>
                      ${Number(op.saldoNetoFinal_A_hacia_B).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Deuda B hacia A */}
                <div className="flex-1 bg-white p-4 rounded border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-gray-800 border-b pb-2 mb-3">Deuda de {op.empresaB.nombre}</h4>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Deuda Bruta Acumulada:</span>
                    <span className="font-semibold text-red-600">${Number(op.deudaBruta_B_hacia_A).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">A cancelar por Netting:</span>
                    <span className="font-semibold text-green-600">- ${Number(op.montoACompensar).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between mt-3 pt-2 border-t font-bold">
                    <span>Saldo Remanente a Pagar:</span>
                    <span className={Number(op.saldoNetoFinal_B_hacia_A) > 0 ? "text-orange-600" : "text-gray-500"}>
                      ${Number(op.saldoNetoFinal_B_hacia_A).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t text-right">
                <button
                  onClick={() => handleEjecutarCompensacion(op, index)}
                  disabled={procesando === index}
                  className={`px-8 py-3 rounded font-bold text-white shadow transition-all ${procesando === index ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {procesando === index ? "🔥 Ejecutando Netting en Web3..." : "Confirmar y Ejecutar Netting"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECCIÓN 2: Libro Mayor / Estado de Cuenta Consolidado */}
      <div className="mt-12 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">Estado de Cuenta Consolidado (Libro Mayor)</h2>
        <p className="text-gray-600 mb-6">Detalle de todos los saldos activos en el Holding (Incluyendo deudas unilaterales y saldos remanentes).</p>

        {saldosGlobales.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 p-6 text-center rounded-lg text-gray-500">
            No hay saldos de deuda pendientes en todo el holding.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Empresa Acreedora (A favor de)</th>
                  <th className="p-4 font-medium">Empresa Deudora (A pagar por)</th>
                  <th className="p-4 font-medium text-right">Saldo Total Activo</th>
                  <th className="p-4 font-medium text-center">Tokens Respaldatorios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {saldosGlobales.map((saldo, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{saldo.acreedor}</td>
                    <td className="p-4 text-gray-600">{saldo.deudor}</td>
                    <td className="p-4 font-black text-blue-600 text-right">
                      $ {Number(saldo.monto_total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                        {saldo.cantidad_tokens} Pagarés
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}