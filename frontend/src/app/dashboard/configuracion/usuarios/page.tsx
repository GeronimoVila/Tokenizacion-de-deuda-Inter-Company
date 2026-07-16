"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
  }, [status, session]);

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
        const resEmp = await fetch(`${apiUrl}/empresas/operativas`, { headers: getHeaders() });
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

  if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando datos...</div>;

  const rolesDisponibles = [
    { id: 3, nombre: "Administrador de Subsidiaria" },
    { id: 4, nombre: "Operador (Carga de Deuda)" },
    { id: 5, nombre: "Auditor" },
  ].filter(rol => rol.id > (miRol || 99));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="mt-2 text-sm text-gray-700">
            {miRol === 2 
              ? "Administra los accesos de todas las subsidiarias del holding." 
              : "Administra el equipo operativo de tu propia subsidiaria."}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={abrirModal}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 sm:w-auto"
          >
            + Invitar Usuario
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Nombre</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Correo Electrónico</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rol</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Subsidiaria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {usuarios.map((user) => (
                    <tr key={user.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.email}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                          {user.rol?.nombre}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {user.empresa?.nombre || <span className="text-gray-400 italic">No aplica</span>}
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500 text-sm">No hay usuarios registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={cerrarModal}></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            
            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 border-b pb-2">
                  Invitar Nuevo Empleado
                </h3>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                      <input
                        type="text"
                        {...register("nombre")}
                        className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Corporativo</label>
                      <input
                        type="email"
                        {...register("email")}
                        className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nivel de Acceso (Rol)</label>
                    <select
                      {...register("rol_id")}
                      className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                    >
                      <option value="">Seleccione un rol...</option>
                      {rolesDisponibles.map((rol) => (
                        <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                      ))}
                    </select>
                    {errors.rol_id && <p className="mt-1 text-xs text-red-600">{errors.rol_id.message}</p>}
                  </div>

                  {miRol === 2 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subsidiaria Asignada</label>
                      <select
                        {...register("empresa_id")}
                        className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                      >
                        <option value="">Seleccione la empresa...</option>
                        {empresas.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                        ))}
                      </select>
                      {errors.empresa_id && <p className="mt-1 text-xs text-red-600">{errors.empresa_id.message}</p>}
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:col-start-2 sm:text-sm"
                    >
                      {isSubmitting ? "Enviando..." : "Registrar Acceso"}
                    </button>
                    <button
                      type="button"
                      onClick={cerrarModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:col-start-1 sm:text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}