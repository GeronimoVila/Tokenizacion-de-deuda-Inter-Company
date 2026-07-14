"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
  wallet_address: z.string().min(10, "La dirección de la wallet es obligatoria"),
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
  }, [status, session]);

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
    if (!confirm(`¿Estás seguro de que deseas ${estaActiva ? 'desactivar' : 'reactivar'} esta empresa?`)) return;

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
    setEmpresaEditando(null);
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando empresas...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas Subsidiarias</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestiona las unidades de negocio que pertenecen al holding.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={abrirModalNuevo}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            + Nueva Empresa
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
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ID</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Nombre</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">CUIT</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Estado</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {empresas.map((empresa) => (
                    <tr key={empresa.id} className={!empresa.activa ? "bg-gray-50" : ""}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{empresa.id}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">{empresa.nombre}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{empresa.cuit}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${empresa.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {empresa.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button 
                          onClick={() => abrirModalEditar(empresa)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => alternarEstadoEmpresa(empresa.id, empresa.activa)}
                          className={`${empresa.activa ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {empresa.activa ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {empresas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-500 text-sm">No hay empresas registradas en este holding.</td>
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
                  {empresaEditando ? "Editar Empresa" : "Registrar Nueva Empresa"}
                </h3>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Razón Social</label>
                    <input
                      type="text"
                      {...register("nombre")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                    {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">CUIT</label>
                    <input
                      type="text"
                      {...register("cuit")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      placeholder="Ej: 30123456789"
                    />
                    {errors.cuit && <p className="mt-1 text-xs text-red-600">{errors.cuit.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Wallet Address (BFA/Web3)</label>
                    <input
                      type="text"
                      {...register("wallet_address")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      placeholder="0x..."
                    />
                    {errors.wallet_address && <p className="mt-1 text-xs text-red-600">{errors.wallet_address.message}</p>}
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                    >
                      {isSubmitting ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={cerrarModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
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