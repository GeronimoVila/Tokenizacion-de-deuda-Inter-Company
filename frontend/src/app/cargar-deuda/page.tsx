"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

// Interfaz para el formulario
interface DeudaFormData {
  empresaDeudoraId: number | "";
  monto: number | "";
  concepto: string;
  comprobante: File | null;
}

// Interfaz para el listado de empresas que trae el backend
interface EmpresaOption {
  id: number;
  nombre: string;
}

export default function CargarDeudaPage() {
  const { data: session } = useSession();
  
  const [formData, setFormData] = useState<DeudaFormData>({
    empresaDeudoraId: "",
    monto: "",
    concepto: "",
    comprobante: null,
  });

  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);

  // Hook para cargar las empresas dinámicamente cuando el usuario inicia sesión
  useEffect(() => {
    if (session?.user?.email) {
      cargarEmpresas();
    }
  }, [session]);

  const cargarEmpresas = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const response = await fetch(`${apiUrl}/empresas/holding`, {
        headers: { 
          "x-user-email": session?.user?.email || "" 
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setEmpresas(result.data);
      } else {
        console.error("Error obteniendo las empresas del holding.");
      }
    } catch (error) {
      console.error("Error de red cargando empresas:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "empresaDeudoraId" || name === "monto" ? Number(value) : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        setMensaje({ tipo: "error", texto: "El comprobante debe ser un archivo PDF." });
        return;
      }
      setFormData((prev) => ({ ...prev, comprobante: file }));
      setMensaje(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {  
    e.preventDefault();
    setIsLoading(true);
    setMensaje(null);

    try {
      if (!formData.comprobante) throw new Error("Debes adjuntar un comprobante en formato PDF.");
      if (!session?.user?.empresa_id) throw new Error("No se pudo identificar tu empresa de origen.");

      const data = new FormData();
      data.append("empresa_contraparte_id", String(formData.empresaDeudoraId));
      data.append("monto", String(formData.monto));
      data.append("detalle", formData.concepto);
      data.append("comprobante", formData.comprobante);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      
      const response = await fetch(`${apiUrl}/deudas/registrar`, {
        method: "POST",
        headers: {
          "x-user-email": session.user.email || "", 
        },
        body: data, 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al registrar la deuda.");
      }

      setMensaje({ tipo: "exito", texto: "Operación registrada con éxito. Pendiente de aprobación." });
      setFormData({ empresaDeudoraId: "", monto: "", concepto: "", comprobante: null });
      const fileInput = document.getElementById("comprobante") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error: any) {
      console.error("Error cargando deuda:", error);
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Cargar Nueva Deuda</h1>

      {mensaje && (
        <div className={`p-4 mb-6 rounded ${mensaje.tipo === "error" ? "bg-red-50 text-red-700 border-l-4 border-red-500" : "bg-green-50 text-green-700 border-l-4 border-green-500"}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa Deudora (Contraparte)
          </label>
          <select
            name="empresaDeudoraId"
            value={formData.empresaDeudoraId}
            onChange={handleInputChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>Seleccione una empresa...</option>
            {/* Renderizamos las empresas de forma dinámica */}
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre} (ID: {emp.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monto (USD / ARS)
          </label>
          <input
            type="number"
            name="monto"
            value={formData.monto}
            onChange={handleInputChange}
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Concepto / Referencia
          </label>
          <input
            type="text"
            name="concepto"
            value={formData.concepto}
            onChange={handleInputChange}
            required
            placeholder="Ej. Factura A-0001-00004532 por servicios"
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comprobante Respaldatorio (Solo PDF)
          </label>
          <input
            type="file"
            id="comprobante"
            accept="application/pdf"
            onChange={handleFileChange}
            required
            className="w-full p-2 border border-gray-300 rounded file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 border border-transparent rounded shadow-sm text-sm font-medium text-white ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isLoading ? "Registrando Operación..." : "Registrar Deuda"}
          </button>
        </div>
      </form>
    </div>
  );
}