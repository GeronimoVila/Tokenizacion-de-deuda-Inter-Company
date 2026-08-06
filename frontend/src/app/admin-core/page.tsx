"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Building, ShieldAlert, CheckCircle2, AlertCircle, Loader2, Power, PowerOff, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface HoldingFormData {
  nombre: string;
  cuit: string;
  nombreAdmin: string;
  adminEmail: string;
}

interface Holding {
  id: number;
  nombre: string;
  cuit: string;
  activo: boolean;
  fecha_creacion: string;
}

export default function AdminCorePage() {
  const { data: session } = useSession();
  
  const [formData, setFormData] = useState<HoldingFormData>({
    nombre: "",
    cuit: "",
    nombreAdmin: "",
    adminEmail: "",
  });

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const backendUrl = "http://localhost:4000/api/sysadmin/holding";

  const fetchHoldings = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(backendUrl, {
        headers: {
          "x-user-email": session?.user?.email || "sysadmin@bfa.ar",
          "Authorization": "Bearer simulado_temporal_sysadmin"
        }
      });
      if (!response.ok) throw new Error("Error al cargar los grupos empresariales");
      const data = await response.json();
      setHoldings(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, [session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!formData.nombre || !formData.cuit || !formData.nombreAdmin || !formData.adminEmail) {
      setError("Todos los campos son obligatorios para inicializar el entorno.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "sysadmin@bfa.ar",
          "Authorization": "Bearer simulado_temporal_sysadmin"
        },
        body: JSON.stringify(formData),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textError = await response.text();
        console.error("Respuesta no válida del servidor:", textError);
        throw new Error("El servidor no devolvió una respuesta JSON válida. Verifica que el backend esté corriendo.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocurrió un error al registrar el holding.");
      }

      setSuccessMsg("¡Holding y Administrador creados exitosamente! El entorno está inicializado.");
      
      setFormData({
        nombre: "",
        cuit: "",
        nombreAdmin: "",
        adminEmail: "",
      });

      fetchHoldings();

    } catch (err: any) {
      console.error("Error en el Onboarding:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHoldingStatus = async (id: number, currentStatus: boolean) => {
    const accion = currentStatus ? "desactivar" : "activar";
    if (!confirm(`¿Estás seguro de que deseas ${accion} este grupo empresarial? Esto limitará a todas sus subsidiarias a modo lectura/auditoría.`)) {
      return;
    }

    try {
      setError(null);
      setSuccessMsg(null);
      
      const response = await fetch(`${backendUrl}/${id}/toggle-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "sysadmin@bfa.ar",
          "Authorization": "Bearer simulado_temporal_sysadmin"
        },
        body: JSON.stringify({ activo: !currentStatus })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Error al ${accion} el holding.`);
      }

      setSuccessMsg(`Holding ${accion}do correctamente.`);
      fetchHoldings();
    } catch (err: any) {
      console.error("Error al cambiar estado:", err);
      setError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 bg-background min-h-screen font-sans">
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Network className="w-8 h-8 text-primary" />
          Panel de Infraestructura
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Gestión del ecosistema core. Desde aquí puedes aprovisionar nuevos holdings o suspender grupos empresariales enteros.
        </p>
      </div>

      <div className="mb-8 space-y-4">
        {error && (
          <Alert variant="destructive" className="shadow-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">Error de Infraestructura</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {successMsg && (
          <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="font-bold">Operación Exitosa</AlertTitle>
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}
      </div>

      <Card className="mb-8 shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800">Inicializar Nuevo Holding</CardTitle>
          <CardDescription>
            Provisiona un entorno corporativo aislado y asigna a su primer Administrador Global.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">

              <div className="space-y-5">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Building className="w-4 h-4" /> Datos de la Entidad
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-slate-700 font-semibold">Razón Social del Grupo</Label>
                    <Input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="bg-slate-50/50"
                      placeholder="Ej. Grupo Tech S.A."
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cuit" className="text-slate-700 font-semibold">CUIT del Holding</Label>
                    <Input
                      type="text"
                      id="cuit"
                      name="cuit"
                      value={formData.cuit}
                      onChange={handleInputChange}
                      className="bg-slate-50/50 font-mono text-sm"
                      placeholder="Sin guiones (Ej. 30123456789)"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Cuenta Administrativa Inicial
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombreAdmin" className="text-slate-700 font-semibold">Nombre del Administrador</Label>
                    <Input
                      type="text"
                      id="nombreAdmin"
                      name="nombreAdmin"
                      value={formData.nombreAdmin}
                      onChange={handleInputChange}
                      className="bg-slate-50/50"
                      placeholder="Nombre completo"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail" className="text-slate-700 font-semibold">Correo Corporativo (Google Auth)</Label>
                    <Input
                      type="email"
                      id="adminEmail"
                      name="adminEmail"
                      value={formData.adminEmail}
                      onChange={handleInputChange}
                      className="bg-slate-50/50"
                      placeholder="admin@grupotech.com"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={isLoading}
                size="lg"
                className="w-full md:w-auto font-bold shadow-sm"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Provisionando entorno...</>
                ) : (
                  "Registrar Holding"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-800">Grupos Empresariales Registrados</CardTitle>
          {isFetching && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-slate-600">Razón Social</TableHead>
                <TableHead className="font-bold text-slate-600">CUIT</TableHead>
                <TableHead className="font-bold text-slate-600">Fecha Alta</TableHead>
                <TableHead className="font-bold text-slate-600 text-center">Estado</TableHead>
                <TableHead className="font-bold text-slate-600 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.length === 0 && !isFetching ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Network className="h-8 w-8 mb-3 text-slate-300" />
                      <span className="text-sm font-semibold text-slate-900">Infraestructura vacía</span>
                      <span className="text-sm mt-1">No hay grupos empresariales aprovisionados en el sistema.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                holdings.map((holding) => (
                  <TableRow key={holding.id} className={`transition-colors ${!holding.activo ? "bg-slate-50/50 opacity-80" : "hover:bg-slate-50/50"}`}>
                    <TableCell className="font-bold text-slate-900">{holding.nombre}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{holding.cuit}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(holding.fecha_creacion).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={holding.activo ? "outline" : "secondary"} className={holding.activo ? "bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[10px] font-bold tracking-wider" : "uppercase text-[10px] font-bold tracking-wider"}>
                        {holding.activo ? "Activo" : "Suspendido"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleHoldingStatus(holding.id, holding.activo)}
                        className={`font-semibold ${holding.activo ? 'text-rose-600 hover:text-rose-900 hover:bg-rose-50' : 'text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50'}`}
                      >
                        {holding.activo ? (
                          <><PowerOff className="w-4 h-4 mr-1.5" /> Desactivar</>
                        ) : (
                          <><Power className="w-4 h-4 mr-1.5" /> Reactivar</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}