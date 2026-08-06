"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PerfilData {
  nombre: string;
  cuit: string;
  wallet_address?: string;
}

export default function ConfiguracionPerfilPage() {
  const { data: session } = useSession();
  const rolId = session?.user?.rol_id;
  
  const [formData, setFormData] = useState<PerfilData>({ nombre: "", cuit: "", wallet_address: "" });
  const [tipoPerfil, setTipoPerfil] = useState<"HOLDING" | "SUBSIDIARIA" | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  useEffect(() => {
    if (session?.user?.email && (rolId === 2 || rolId === 3)) {
      cargarPerfil();
    }
  }, [session, rolId]);

  const cargarPerfil = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiUrl}/configuracion/perfil`, {
        headers: { "x-user-email": session?.user?.email || "" }
      });
      
      if (!response.ok) throw new Error("Error al cargar los datos del perfil.");
      
      const { tipo, data } = await response.json();
      setTipoPerfil(tipo);
      setFormData({
        nombre: data.nombre || "",
        cuit: data.cuit || "",
        wallet_address: data.wallet_address || ""
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const endpoint = tipoPerfil === "HOLDING" ? "/configuracion/holding" : "/configuracion/subsidiaria";

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "" 
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al actualizar los datos.");

      setSuccess(data.mensaje || "Datos actualizados correctamente.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (rolId !== 2 && rolId !== 3) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8 mt-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>No posees permisos de administración para acceder a la configuración de este entorno.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 bg-background min-h-screen font-sans">
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          Configuración de {tipoPerfil === "HOLDING" ? "Grupo Empresarial" : "unidad de negocio"}
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Actualiza los datos estructurales y de infraestructura Web3 de tu entidad.
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit}>
            
            <div className="px-6 md:px-8 pt-8">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-bold">Error al guardar</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="mb-6 bg-emerald-50 text-emerald-900 border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="font-bold">Operación Exitosa</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="px-6 md:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              
              <div className="space-y-6">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
                  Datos Fiscales
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-slate-700 font-semibold">Razón social / Nombre</Label>
                    <Input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      required
                      disabled={isSaving}
                      className="bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cuit" className="text-slate-700 font-semibold">CUIT</Label>
                    <Input
                      type="text"
                      id="cuit"
                      name="cuit"
                      value={formData.cuit}
                      onChange={handleInputChange}
                      required
                      disabled={isSaving}
                      className="bg-slate-50/50 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
                  Infraestructura Web3
                </h3>
                
                {tipoPerfil === "SUBSIDIARIA" ? (
                  <div className="space-y-2">
                    <Label htmlFor="wallet_address" className="text-slate-700 font-semibold">Dirección de billetera (BFA)</Label>
                    <Input
                      type="text"
                      id="wallet_address"
                      name="wallet_address"
                      value={formData.wallet_address}
                      onChange={handleInputChange}
                      placeholder="0x..."
                      disabled={isSaving}
                      className="bg-slate-50/50 font-mono text-sm"
                    />
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed pt-1">
                      Esta Wallet se utilizará para la emisión (Mint) y destrucción (Burn) de los tokens representativos de deuda.
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-md p-6">
                    <p className="text-xs text-slate-500 text-center">
                      El perfil de Holding no requiere configuración de billetera Web3 para operaciones directas.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 md:px-8 py-5 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full md:w-auto font-bold shadow-sm"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}