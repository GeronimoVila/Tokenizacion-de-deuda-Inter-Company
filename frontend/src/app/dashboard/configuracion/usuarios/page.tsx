"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Users, ShieldAlert, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Usuario {
  id: number;
  name: string;
  email: string;
  rol: { nombre: string };
  empresa?: { nombre: string } | null;
}

interface Empresa {
  id: number;
  nombre: string;
}

const usuarioSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Debe ser un correo electrónico válido"),
  rol_id: z.string().min(1, "Debe seleccionar un rol"),
  empresa_id: z.string().optional(),
});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

export default function GestionUsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const miRol = session?.user?.rol_id;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (miRol !== 2 && miRol !== 3) {
        router.push("/dashboard");
      } else {
        cargarDatos();
      }
    }
  }, [status, session, router, miRol]);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-email": session?.user?.email || "",
  });

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const resUsr = await fetch(`${apiUrl}/usuarios`, { headers: getHeaders() });
      const dataUsr = await resUsr.json();
      if (dataUsr.success) setUsuarios(dataUsr.data);

      if (miRol === 2) {
        const resEmp = await fetch(`${apiUrl}/empresas`, { headers: getHeaders() });
        const dataEmp = await resEmp.json();
        if (dataEmp.success) setEmpresas(dataEmp.data);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: UsuarioFormData) => {
    try {
      const payload = {
        ...data,
        rol_id: parseInt(data.rol_id),
        empresa_id: data.empresa_id ? parseInt(data.empresa_id) : null,
      };

      const res = await fetch(`${apiUrl}/usuarios`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        cerrarModal();
        cargarDatos();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error al invitar usuario:", error);
    }
  };

  const abrirModal = () => {
    reset({ nombre: "", email: "", rol_id: "", empresa_id: "" });
    setIsModalOpen(true);
  };

  const cerrarModal = () => setIsModalOpen(false);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const rolesDisponibles = [
    { id: 3, nombre: "Administrador de Subsidiaria" },
    { id: 4, nombre: "Operador (Carga de Deuda)" },
    { id: 5, nombre: "Auditor" },
  ].filter(rol => rol.id > (miRol || 99));

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 bg-background min-h-screen font-sans">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Gestión de usuarios</h1>
          <p className="text-sm text-slate-500 mt-2">
            {miRol === 2 
              ? "Administra los accesos de todas las subsidiarias del holding." 
              : "Administra el equipo operativo de tu propia subsidiaria."}
          </p>
        </div>
        <Button onClick={abrirModal} className="font-bold shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Invitar usuario
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-slate-600">Nombre</TableHead>
                <TableHead className="font-bold text-slate-600">Correo electrónico</TableHead>
                <TableHead className="font-bold text-slate-600">Rol</TableHead>
                <TableHead className="font-bold text-slate-600">Subsidiaria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-semibold text-slate-900">{user.name}</TableCell>
                  <TableCell className="text-slate-500">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 uppercase text-[10px] font-bold tracking-wider">
                      {user.rol?.nombre}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium">
                    {user.empresa?.nombre ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {user.empresa.nombre}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Acceso Global</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {usuarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users className="h-8 w-8 mb-3 text-slate-300" />
                      <span className="text-sm font-semibold text-slate-900">Sin usuarios</span>
                      <span className="text-sm mt-1">No hay usuarios registrados en el entorno.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-137.5 p-6 border-t-4 border-t-primary">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">Invitar Nuevo Empleado</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 pt-1">
              Complete los datos del empleado para otorgarle acceso seguro al sistema corporativo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-slate-700 font-semibold">Nombre completo</Label>
                <Input
                  id="nombre"
                  {...register("nombre")}
                  disabled={isSubmitting}
                  className="bg-slate-50/50"
                  placeholder="Ej. Juan Pérez"
                />
                {errors.nombre && <p className="text-xs text-destructive font-medium">{errors.nombre.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-semibold">Email corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  disabled={isSubmitting}
                  className="bg-slate-50/50"
                  placeholder="ejemplo@empresa.com"
                />
                {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol_id" className="text-slate-700 font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Nivel de acceso (Rol)
              </Label>
              <Controller
                name="rol_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <SelectTrigger className="bg-slate-50/50">
                      <SelectValue placeholder="Seleccione un rol..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesDisponibles.map((rol) => (
                        <SelectItem key={rol.id} value={rol.id.toString()}>{rol.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.rol_id && <p className="text-xs text-destructive font-medium">{errors.rol_id.message}</p>}
            </div>

            {miRol === 2 && (
              <div className="space-y-2">
                <Label htmlFor="empresa_id" className="text-slate-700 font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Subsidiaria asignada
                </Label>
                <Controller
                  name="empresa_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <SelectTrigger className="bg-slate-50/50">
                        <SelectValue placeholder="Seleccione la empresa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {empresas.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>{emp.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.empresa_id && <p className="text-xs text-destructive font-medium">{errors.empresa_id.message}</p>}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando...</>
                ) : (
                  "Registrar acceso"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}