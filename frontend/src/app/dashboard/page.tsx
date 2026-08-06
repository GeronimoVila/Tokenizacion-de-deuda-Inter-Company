"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, ShieldAlert, Lock, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alertas, setAlertas] = useState<AlertaPendiente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isGlobalAdmin = [1, 2, 5].includes(session?.user?.rol_id || 0);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  const empresaActiva = session?.user?.empresa_activa ?? true;
  const holdingActivo = session?.user?.holding_activo ?? true;
  const entornoInactivo = (empresaActiva === false || holdingActivo === false);
  
  const accesoBloqueado = searchParams.get('error') === 'baja_logica';

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
      <div className="flex h-full min-h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="font-medium text-sm tracking-wide">Sincronizando información financiera...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto bg-background min-h-screen space-y-8">
      
      {accesoBloqueado && (
        <Card className="border-destructive/50 bg-destructive/10 shadow-none">
          <CardContent className="flex items-center gap-3 p-4 text-destructive text-sm font-medium">
            <ShieldAlert className="h-5 w-5" />
            Acceso Denegado: Intentó acceder a un módulo operativo mientras el entorno se encuentra suspendido.
          </CardContent>
        </Card>
      )}

      {entornoInactivo && (
        <Card className="border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Entorno en Modo Auditoría</h3>
              <p className="mt-1 text-sm text-amber-700">
                {holdingActivo === false 
                  ? "El grupo empresarial ha sido suspendido por la administración global." 
                  : "Su empresa subsidiaria ha sido suspendida temporalmente."}
                {" "}Su cuenta ha sido limitada a permisos de solo lectura para auditar la trazabilidad en la BFA. No puede emitir ni aprobar operaciones.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Resumen de deuda tokenizada
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isGlobalAdmin 
              ? "Vista consolidada de pasivos inter-company para el Holding corporativo." 
              : "Vista consolidada de pasivos inter-company para su unidad de negocio."}
          </p>
        </div>
        <Button asChild size="lg" className="shadow-sm">
          <Link href="/cargar-deuda">
            <Plus className="mr-2 h-4 w-4" />
            Nueva emisión
          </Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Deuda Total Activa (Tokenizada)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline mb-8">
            <span className={`text-4xl md:text-5xl font-extrabold tracking-tight ${metrics?.saldos.saldoNeto && metrics.saldos.saldoNeto < 0 ? 'text-destructive' : 'text-foreground'}`}>
              {formatearDinero(metrics?.saldos.saldoNeto || 0)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">A Subsidiarias</p>
              <p className="text-lg font-bold text-foreground">{formatearDinero(metrics?.saldos.aPagar || 0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Desde Holding</p>
              <p className="text-lg font-bold text-foreground">{formatearDinero(metrics?.saldos.aCobrar || 0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Smart Contracts Activos</p>
              <p className="text-lg font-bold text-foreground">{metrics?.tokensActivos || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Transacciones recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Contraparte</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertas.length > 0 ? (
                alertas.map((alerta) => (
                  <TableRow key={alerta.id} className="group">
                    <TableCell className="font-semibold">{alerta.empresa_emisora.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{alerta.detalle}</TableCell>
                    <TableCell className="font-bold">{formatearDinero(alerta.monto)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Validación pendiente
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatearFecha(alerta.fecha_creacion)}</TableCell>
                    <TableCell>
                      {!entornoInactivo ? (
                        <Button variant="link" asChild className="px-0">
                          <Link href={`/aprobaciones?id=${alerta.id}`}>
                            Revisar PDF
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">Bloqueada</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mb-3 text-muted/50" />
                      <span className="text-sm font-semibold text-foreground">Todo al día</span>
                      <span className="text-sm mt-1">No hay obligaciones financieras pendientes de validación en la red.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}