"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Landmark, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4 text-slate-600">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-sm font-bold tracking-widest uppercase">
            Verificando credenciales corporativas...
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 font-sans">
        <div className="w-full max-w-md">
          
          <div className="flex justify-center mb-8">
            <div className="bg-primary/10 p-3.5 rounded-2xl border border-primary/20 shadow-sm">
              <Landmark className="w-10 h-10 text-primary" />
            </div>
          </div>
          
          <Card className="shadow-xl border-slate-200 bg-white">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
                Tokenización Inter-Company
              </CardTitle>
              <CardDescription className="text-slate-500 mt-2 font-medium">
                Plataforma de compensación y liquidación de activos en la Blockchain Federal Argentina.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 flex items-start gap-3 shadow-inner">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Acceso restringido. Por favor, identifícate exclusivamente con tu <strong>cuenta corporativa de Google</strong> asignada por la administración del holding.
                </p>
              </div>

              <Button
                size="lg"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="w-full font-bold text-md shadow-sm h-12 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-all hover:shadow"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Continuar con Google
              </Button>
            </CardContent>
          </Card>
          
          <div className="text-center mt-8 space-y-1">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Infraestructura B2B • BFA Network
            </p>
          </div>
        </div>
      </main>
    );
  }

  return null;
}