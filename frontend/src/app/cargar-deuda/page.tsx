"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeudaFormData {
  empresaDeudoraId: number | "";
  monto: number | "";
  concepto: string;
  comprobante: File | null;
}

interface EmpresaOption {
  id: number;
  nombre: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; 

export default function CargarDeudaPage() {
  const { data: session } = useSession();
  
  if (session?.user?.empresa_activa === false) {
    return (
      <div className="flex justify-center mt-10">
        <Card className="max-w-2xl w-full shadow-sm border-slate-200">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-amber-100 rounded-full">
                <Lock className="h-8 w-8 text-amber-700" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Acceso Restringido</h1>
            <Alert variant="destructive" className="bg-amber-50 text-amber-900 border-amber-200 text-left mt-4">
              <AlertCircle className="h-4 w-4 text-amber-700" />
              <AlertTitle className="text-amber-800 font-bold">Tu subsidiaria se encuentra inactiva.</AlertTitle>
              <AlertDescription className="text-amber-700/90 mt-2">
                Solo tienes acceso de lectura para visualizar la auditoría histórica de tus saldos pasados. No puedes registrar nuevas operaciones.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [formData, setFormData] = useState<DeudaFormData>({
    empresaDeudoraId: "",
    monto: "",
    concepto: "",
    comprobante: null,
  });

  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      cargarEmpresas();
    }
  }, [session]);

  const cargarEmpresas = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const response = await fetch(`${apiUrl}/empresas/operativas`, {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "monto" ? Number(value) : value,
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, empresaDeudoraId: Number(value) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (file.type !== "application/pdf" || file.size > MAX_FILE_SIZE) {
        setMensaje({ tipo: "error", texto: "Formato inválido o archivo demasiado pesado. Solo se permiten PDFs de hasta 5MB." });
        e.target.value = '';
        setFormData((prev) => ({ ...prev, comprobante: null }));
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
      if (!formData.comprobante) {
        throw new Error("Documento de respaldo PDF obligatorio");
      }
      
      if (!session?.user?.empresa_id) throw new Error("No se pudo identificar tu empresa de origen.");
      
      if (session.user.empresa_id === Number(formData.empresaDeudoraId)) {
        throw new Error("La empresa receptora no puede ser idéntica a la emisora");
      }

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

      setMensaje({ tipo: "exito", texto: "Operación registrada con éxito. Pendiente de validación por la contraparte." });
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
    <div className="p-6 md:p-8">
      <Card className="max-w-2xl mx-auto shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 pb-6 mb-6">
          <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
            Cargar nueva deuda
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {mensaje && (
            <Alert 
              variant={mensaje.tipo === "error" ? "destructive" : "default"} 
              className={`mb-6 ${mensaje.tipo === "exito" ? "bg-emerald-50 text-emerald-900 border-emerald-200" : ""}`}
            >
              {mensaje.tipo === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              <AlertTitle className="font-bold">
                {mensaje.tipo === "error" ? "Error de validación" : "Operación exitosa"}
              </AlertTitle>
              <AlertDescription>{mensaje.texto}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="empresaDeudoraId" className="text-slate-700 font-semibold">
                Empresa deudora
              </Label>
              <Select 
                onValueChange={handleSelectChange} 
                value={formData.empresaDeudoraId.toString()} 
                required
              >
                <SelectTrigger className="w-full bg-slate-50/50">
                  <SelectValue placeholder="Seleccione una empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nombre} (ID: {emp.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto" className="text-slate-700 font-semibold">
                Monto (ARS)
              </Label>
              <Input
                type="number"
                id="monto"
                name="monto"
                value={formData.monto}
                onChange={handleInputChange}
                required
                min="1.00"
                step="1.00"
                placeholder="0"
                className="bg-slate-50/50 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concepto" className="text-slate-700 font-semibold">
                Concepto / Referencia
              </Label>
              <Input
                type="text"
                id="concepto"
                name="concepto"
                value={formData.concepto}
                onChange={handleInputChange}
                required
                placeholder="Ej. Factura A-0001-00004532 por servicios"
                className="bg-slate-50/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprobante" className="text-slate-700 font-semibold">
                Comprobante de respaldatorio (Solo PDF)
              </Label>
              <Input
                type="file"
                id="comprobante"
                accept="application/pdf"
                onChange={handleFileChange}
                required
                className="cursor-pointer bg-slate-50/50 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-900 hover:file:bg-slate-300"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                size="lg"
                className="w-full text-md font-bold tracking-wide"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Registrando Operación...
                  </>
                ) : (
                  "Registrar deuda"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}