"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Building2, Edit, Power, PowerOff, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Empresa {
  id: number;
  nombre: string;
  cuit: string;
  wallet_address: string;
  activa: boolean;
}

const empresaSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  cuit: z.string().regex(/^\d{11}$/, "El CUIT debe contener exactamente 11 números"),
  wallet_address: z.string().min(10, "La dirección de la wallet Web3 es obligatoria"),
});

type EmpresaFormData = z.infer<typeof empresaSchema>;

export default function ConfiguracionEmpresasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (session?.user?.rol_id !== 2) {
        router.push("/dashboard");
      } else {
        cargarEmpresas();
      }
    }
  }, [status, session, router]);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-email": session?.user?.email || "",
  });

  const cargarEmpresas = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/empresas`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setEmpresas(data.data);
      }
    } catch (error) {
      console.error("Error al cargar empresas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EmpresaFormData) => {
    try {
      const url = empresaEditando
        ? `${apiUrl}/empresas/${empresaEditando.id}`
        : `${apiUrl}/empresas`;

      const method = empresaEditando ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (res.ok) {
        cerrarModal();
        cargarEmpresas();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  const alternarEstadoEmpresa = async (id: number, estaActiva: boolean) => {
    if (!confirm(`¿Estás seguro de que deseas ${estaActiva ? 'desactivar' : 'reactivar'} esta empresa? Las operaciones históricas se mantendrán intactas.`)) return;

    try {
      const endpoint = estaActiva ? "desactivar" : "activar";
      const res = await fetch(`${apiUrl}/empresas/${id}/${endpoint}`, {
        method: "PATCH",
        headers: getHeaders(),
      });

      if (res.ok) {
        cargarEmpresas();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  const abrirModalNuevo = () => {
    setEmpresaEditando(null);
    reset({ nombre: "", cuit: "", wallet_address: "" });
    setIsModalOpen(true);
  };

  const abrirModalEditar = (empresa: Empresa) => {
    setEmpresaEditando(empresa);
    setValue("nombre", empresa.nombre);
    setValue("cuit", empresa.cuit);
    setValue("wallet_address", empresa.wallet_address);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEmpresaEditando(null), 200);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 bg-background min-h-screen font-sans">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Empresas subsidiarias</h1>
          <p className="text-sm text-slate-500 mt-2">
            Gestiona las unidades de negocio que pertenecen al holding y su configuración Web3.
          </p>
        </div>
        <Button onClick={abrirModalNuevo} className="font-bold shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Nueva empresa
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-slate-600 w-16">ID</TableHead>
                <TableHead className="font-bold text-slate-600">Razón social</TableHead>
                <TableHead className="font-bold text-slate-600">CUIT</TableHead>
                <TableHead className="font-bold text-slate-600">Infraestructura Web3</TableHead>
                <TableHead className="font-bold text-slate-600 text-center">Estado</TableHead>
                <TableHead className="font-bold text-slate-600 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((empresa) => (
                <TableRow key={empresa.id} className={`transition-colors ${!empresa.activa ? "bg-slate-50/50 opacity-80" : "hover:bg-slate-50/50"}`}>
                  <TableCell className="font-mono text-xs text-slate-500">{empresa.id}</TableCell>
                  <TableCell className="font-semibold text-slate-900">{empresa.nombre}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-600">{empresa.cuit}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200 truncate max-w-37.5 lg:max-w-50" title={empresa.wallet_address}>
                      <Wallet className="w-3 h-3 text-primary" /> {empresa.wallet_address}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={empresa.activa ? "outline" : "secondary"} className={empresa.activa ? "bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[10px] font-bold tracking-wider" : "uppercase text-[10px] font-bold tracking-wider"}>
                      {empresa.activa ? 'Activa' : 'Baja Lógica'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => abrirModalEditar(empresa)}
                        className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 font-semibold"
                      >
                        <Edit className="w-4 h-4 mr-1.5" /> Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => alternarEstadoEmpresa(empresa.id, empresa.activa)}
                        className={`font-semibold ${empresa.activa ? 'text-rose-600 hover:text-rose-900 hover:bg-rose-50' : 'text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50'}`}
                      >
                        {empresa.activa ? (
                          <><PowerOff className="w-4 h-4 mr-1.5" /> Desactivar</>
                        ) : (
                          <><Power className="w-4 h-4 mr-1.5" /> Activar</>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {empresas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Building2 className="h-8 w-8 mb-3 text-slate-300" />
                      <span className="text-sm font-semibold text-slate-900">Sin subsidiarias</span>
                      <span className="text-sm mt-1">No hay empresas registradas en este holding.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => !isOpen && cerrarModal()}>
        <DialogContent className="sm:max-w-125 p-6 border-t-4 border-t-primary">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {empresaEditando ? "Editar Empresa" : "Registrar Nueva Empresa"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 pt-1">
              Complete los datos fiscales y la infraestructura blockchain (BFA) necesaria para la filial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-slate-700 font-semibold">Razón social / Nombre</Label>
              <Input
                id="nombre"
                {...register("nombre")}
                disabled={isSubmitting}
                className="bg-slate-50/50"
                placeholder="Ej. Logística S.A."
              />
              {errors.nombre && <p className="text-xs text-destructive font-medium">{errors.nombre.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuit" className="text-slate-700 font-semibold">CUIT (Sin guiones)</Label>
              <Input
                id="cuit"
                type="text"
                {...register("cuit")}
                disabled={isSubmitting}
                className="bg-slate-50/50 font-mono text-sm"
                placeholder="Ej: 30123456789"
              />
              {errors.cuit && <p className="text-xs text-destructive font-medium">{errors.cuit.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet_address" className="text-slate-700 font-semibold">Wallet address (BFA/Web3)</Label>
              <Input
                id="wallet_address"
                type="text"
                {...register("wallet_address")}
                disabled={isSubmitting}
                className="bg-slate-50/50 font-mono text-sm"
                placeholder="0x..."
              />
              <p className="text-[11px] text-muted-foreground mt-1">Dirección obligatoria para la emisión y quema de tokens de deuda.</p>
              {errors.wallet_address && <p className="text-xs text-destructive font-medium">{errors.wallet_address.message}</p>}
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 gap-3 sm:gap-0 mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={cerrarModal}
                disabled={isSubmitting}
                className="font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-bold shadow-sm"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  "Guardar empresa"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}