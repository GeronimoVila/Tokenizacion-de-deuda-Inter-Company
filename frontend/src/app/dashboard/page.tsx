"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardMetrics {
  operacionesPendientes: number;
  tokensActivos: number;
  saldos: {
    aCobrar: number;
    aPagar: number;
    saldoNeto: number;
  };
}

interface AlertaPendiente {
  id: number;
  empresa_emisora: { nombre: string };
  monto: number;
  detalle: string;
  fecha_creacion: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alertas, setAlertas] = useState<AlertaPendiente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isGlobalAdmin = [1, 2, 5].includes(session?.user?.rol_id || 0);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  useEffect(() => {
    if (session?.user?.email) {
      cargarDatosDashboard();
    }
  }, [session]);

  const cargarDatosDashboard = async () => {
    try {
      setIsLoading(true);
      const headers = {
        "Content-Type": "application/json",
        "x-user-email": session?.user?.email || "",
      };

      const [resMetrics, resAlertas] = await Promise.all([
        fetch(`${apiUrl}/dashboard/metrics`, { headers }),
        fetch(`${apiUrl}/deudas/pendientes`, { headers })
      ]);

      if (resMetrics.ok) {
        const dataMetrics = await resMetrics.json();
        if (dataMetrics.success) setMetrics(dataMetrics.data);
      }

      if (resAlertas.ok) {
        const dataAlertas = await resAlertas.json();
        if (dataAlertas.success) setAlertas(dataAlertas.data);
      }

    } catch (error) {
      console.error("Error al cargar los datos del dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatearDinero = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(monto);
  };

  const formatearFecha = (fechaString: string) => {
    const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(fechaString).toLocaleDateString('es-AR', opciones);
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-500 font-medium">Consolidando información financiera...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Hola, {session?.user?.name?.split(' ')[0] || 'Usuario'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isGlobalAdmin 
            ? "Visión Consolidada del Holding Empresarial." 
            : "Vista restringida de unidad de negocio local."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-10 sm:grid-cols-2 lg:grid-cols-3">
        
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 relative hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0 bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Saldo de Deuda Neta</dt>
                  <dd>
                    <div className={`text-2xl font-bold ${metrics?.saldos.saldoNeto && metrics.saldos.saldoNeto < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatearDinero(metrics?.saldos.saldoNeto || 0)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0 bg-blue-50 rounded-lg p-3 border border-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Tokens BFA Activos</dt>
                  <dd>
                    <div className="text-2xl font-bold text-gray-900">{metrics?.tokensActivos || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0 bg-amber-50 rounded-lg p-3 border border-amber-100">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Operaciones Pendientes</dt>
                  <dd>
                    <div className="text-2xl font-bold text-gray-900">{metrics?.operacionesPendientes || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <h3 className="text-lg leading-6 font-semibold text-gray-900">Alertas de Validación Pendientes</h3>
          {!isGlobalAdmin && alertas.length > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Requieren tu atención
            </span>
          )}
        </div>
        
        <div className="px-0 sm:px-0">
          {alertas.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {alertas.map((alerta) => (
                <li key={alerta.id} className="px-6 py-5 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">
                      {alerta.empresa_emisora.nombre} ha registrado una obligación
                    </span>
                    <span className="text-sm text-gray-500 mt-1">Concepto: {alerta.detalle}</span>
                    <span className="text-xs text-gray-400 mt-1">Recibido el: {formatearFecha(alerta.fecha_creacion)}</span>
                  </div>
                  <div className="flex items-center space-x-6">
                    <span className="text-base font-bold text-gray-900">{formatearDinero(alerta.monto)}</span>
                    <Link 
                      href="/aprobaciones"
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Revisar PDF &rarr;
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-medium text-gray-900">Todo al día</h3>
              <p className="mt-1 text-sm text-gray-500">No tienes obligaciones financieras pendientes de validación.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}