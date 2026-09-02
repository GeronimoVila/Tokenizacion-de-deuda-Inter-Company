"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Users, ShieldAlert, Building2, Search, FilterX, UserX, UserCheck, Pencil, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Usuario {
  id: number;
  name: string;
  email: string;
  activo: boolean;
  rol_id?: number;
  empresa_id?: number | null;
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
  const [modoModal, setModoModal] = useState<"crear" | "editar">("crear");
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [modalConfirmacionEstado, setModalConfirmacionEstado] = useState<{
    isOpen: boolean;
    usuario: Usuario | null;
  }>({ isOpen: false, usuario: null });

  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroEmail, setFiltroEmail] = useState("");
  const [filtroRol, setFiltroRol] = useState("TODOS");
  const [filtroEmpresa, setFiltroEmpresa] = useState("TODAS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

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

      const endpoint = modoModal === "editar" && usuarioEditando
        ? `${apiUrl}/usuarios/${usuarioEditando.id}`
        : `${apiUrl}/usuarios`;
        
      const method = modoModal === "editar" ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
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
      console.error("Error al procesar usuario:", error);
    }
  };

  const confirmarAlternarEstadoUsuario = async () => {
    const usuario = modalConfirmacionEstado.usuario;
    if (!usuario) return;

    setModalConfirmacionEstado({ isOpen: false, usuario: null });

    try {
      const res = await fetch(`${apiUrl}/usuarios/${usuario.id}/estado`, {
        method: "PATCH",
        headers: getHeaders(),
      });

      if (res.ok) {
        cargarDatos();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  const abrirModalCreacion = () => {
    setModoModal("crear");
    setUsuarioEditando(null);
    reset({ nombre: "", email: "", rol_id: "", empresa_id: "" });
    setIsModalOpen(true);
  };

  const abrirModalEdicion = (usuario: Usuario) => {
    setModoModal("editar");
    setUsuarioEditando(usuario);
    reset({
      nombre: usuario.name,
      email: usuario.email,
      rol_id: usuario.rol_id ? usuario.rol_id.toString() : "",
      empresa_id: usuario.empresa_id ? usuario.empresa_id.toString() : "",
    });
    setIsModalOpen(true);
  };

  const cerrarModal = () => setIsModalOpen(false);

  const formatearNombreRol = (rolBd: string | undefined) => {
    if (!rolBd) return "Desconocido";
    const mapaRoles: Record<string, string> = {
      "admin_holding": "Administrador del Holding",
      "admin_subsidiaria": "Administrador de Subsidiaria",
      "operador": "Operador",
      "auditor": "Auditor",
      "superadmin": "Administrador Global",
    };
    const clave = rolBd.toLowerCase().trim();
    return mapaRoles[clave] || rolBd.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const limpiarFiltros = () => {
    setFiltroNombre("");
    setFiltroEmail("");
    setFiltroRol("TODOS");
    setFiltroEmpresa("TODAS");
    setFiltroEstado("TODOS");
  };

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((user) => {
      const coincideNombre = user.name.toLowerCase().includes(filtroNombre.toLowerCase());
      const coincideEmail = user.email.toLowerCase().includes(filtroEmail.toLowerCase());
      const coincideRol = filtroRol === "TODOS" || user.rol?.nombre === filtroRol;
      const nombreEmpresa = user.empresa?.nombre || "Global";
      const coincideEmpresa = filtroEmpresa === "TODAS" || nombreEmpresa === filtroEmpresa;
      
      let coincideEstado = true;
      if (filtroEstado === "ACTIVO") coincideEstado = user.activo === true;
      if (filtroEstado === "INACTIVO") coincideEstado = user.activo === false;

      return coincideNombre && coincideEmail && coincideRol && coincideEmpresa && coincideEstado;
    });
  }, [usuarios, filtroNombre, filtroEmail, filtroRol, filtroEmpresa, filtroEstado]);

  const rolesEnTabla = Array.from(new Set(usuarios.map(u => u.rol?.nombre).filter(Boolean)));
  const empresasEnTabla = Array.from(new Set(usuarios.map(u => u.empresa?.nombre || "Global")));

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
    { id: 5, nombre: "Auditor Corporativo" },
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
        <Button onClick={abrirModalCreacion} className="font-bold shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Invitar usuario
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200 mb-6 bg-white">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5 xl:col-span-1">
              <Label className="text-xs font-semibold text-slate-500">Buscar por nombre</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Ej. Juan Pérez" 
                  value={filtroNombre} 
                  onChange={(e) => setFiltroNombre(e.target.value)}
                  className="pl-9 h-9 text-sm bg-slate-50/50"
                />
              </div>
            </div>
            
            <div className="space-y-1.5 xl:col-span-1">
              <Label className="text-xs font-semibold text-slate-500">Buscar por correo</Label>
              <Input 
                placeholder="usuario@empresa.com" 
                value={filtroEmail} 
                onChange={(e) => setFiltroEmail(e.target.value)}
                className="h-9 text-sm bg-slate-50/50"
              />
            </div>

            <div className="space-y-1.5 xl:col-span-1">
              <Label className="text-xs font-semibold text-slate-500">Filtrar por rol</Label>
              <Select value={filtroRol} onValueChange={setFiltroRol}>
                <SelectTrigger className="h-9 text-sm bg-slate-50/50">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los roles</SelectItem>
                  {rolesEnTabla.map((rolDb) => (
                    <SelectItem key={rolDb} value={rolDb}>{formatearNombreRol(rolDb)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {miRol === 2 && (
              <div className="space-y-1.5 xl:col-span-1">
                <Label className="text-xs font-semibold text-slate-500">Filtrar subsidiaria</Label>
                <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                  <SelectTrigger className="h-9 text-sm bg-slate-50/50">
                    <SelectValue placeholder="Todas las empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas las empresas</SelectItem>
                    {empresasEnTabla.map((emp) => (
                      <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5 xl:col-span-1">
              <Label className="text-xs font-semibold text-slate-500">Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="h-9 text-sm bg-slate-50/50">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los estados</SelectItem>
                  <SelectItem value="ACTIVO">Activos</SelectItem>
                  <SelectItem value="INACTIVO">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end xl:col-span-1">
              <Button 
                variant="ghost" 
                onClick={limpiarFiltros}
                className="h-9 w-full xl:w-auto text-slate-500 hover:text-slate-900 font-semibold text-sm px-3"
              >
                <FilterX className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-slate-600">Nombre</TableHead>
                <TableHead className="font-bold text-slate-600">Correo electrónico</TableHead>
                <TableHead className="font-bold text-slate-600">Rol</TableHead>
                <TableHead className="font-bold text-slate-600">Subsidiaria</TableHead>
                <TableHead className="font-bold text-slate-600">Estado</TableHead>
                <TableHead className="font-bold text-slate-600 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuariosFiltrados.map((user) => (
                <TableRow key={user.id} className={`transition-colors ${!user.activo ? 'opacity-60 bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                  <TableCell className="font-semibold text-slate-900">{user.name}</TableCell>
                  <TableCell className="text-slate-500">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold tracking-wider">
                      {formatearNombreRol(user.rol?.nombre)}
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
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] font-bold tracking-wider uppercase ${user.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => abrirModalEdicion(user)}
                      disabled={session?.user?.email === user.email}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title={session?.user?.email === user.email ? "No puedes editar tus propios permisos" : "Modificar usuario"}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setModalConfirmacionEstado({ isOpen: true, usuario: user })}
                      disabled={session?.user?.email === user.email}
                      className={user.activo ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                      title={session?.user?.email === user.email ? "No puedes modificar tu propio acceso" : (user.activo ? "Desactivar acceso" : "Reactivar acceso")}
                    >
                      {user.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {usuariosFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users className="h-8 w-8 mb-3 text-slate-300" />
                      <span className="text-sm font-semibold text-slate-900">Sin resultados</span>
                      <span className="text-sm mt-1">No se encontraron usuarios que coincidan con los filtros aplicados.</span>
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
            <DialogTitle className="text-xl font-bold text-slate-900">
              {modoModal === "crear" ? "Invitar Nuevo Empleado" : "Modificar Accesos del Empleado"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 pt-1">
              {modoModal === "crear" 
                ? "Complete los datos del empleado para otorgarle acceso seguro al sistema corporativo." 
                : "Actualice el rol o la subsidiaria para modificar los privilegios de este usuario dentro de la plataforma."}
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                ) : (
                  modoModal === "crear" ? "Registrar acceso" : "Guardar cambios"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={modalConfirmacionEstado.isOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen) setModalConfirmacionEstado({ isOpen: false, usuario: null });
        }}
      >
        <DialogContent className="sm:max-w-md border-t-4 border-t-amber-500 p-6">
          <DialogHeader className="mb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-500/20 text-amber-600 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">Confirmación de Seguridad</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600 pt-1">
              ¿Estás seguro de que deseas{" "}
              <span className="font-bold text-slate-900 underline">
                {modalConfirmacionEstado.usuario?.activo ? 'desactivar' : 'reactivar'}
              </span>{" "}
              el acceso al usuario <span className="font-bold text-slate-900">{modalConfirmacionEstado.usuario?.name}</span> ({modalConfirmacionEstado.usuario?.email})?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-3 sm:gap-0 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setModalConfirmacionEstado({ isOpen: false, usuario: null })}
              className="font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button 
              variant={modalConfirmacionEstado.usuario?.activo ? "destructive" : "default"}
              onClick={confirmarAlternarEstadoUsuario}
              className="font-bold shadow-sm"
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}