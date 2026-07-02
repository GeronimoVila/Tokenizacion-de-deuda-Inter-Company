// frontend/src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // --- LOGS DE DEBUGGEO (Mirá la terminal donde corre tu frontend) ---
    console.log("\n=== DEBUG MIDDLEWARE ===");
    console.log("Ruta solicitada:", path);
    console.log("Token completo extraído:", token);
    console.log("Rol ID en token:", token?.rol_id, "| Tipo:", typeof token?.rol_id);
    console.log("========================\n");

    if (!token) {
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }

    // Convertimos explícitamente a Número por si JSON lo transformó en String
    const rolId = Number(token.rol_id); 

    // Módulo de Netting / Compensación
    if (path.startsWith("/netting") && ![1, 2].includes(rolId)) {
      console.warn(`🚨 Bloqueado en Middleware: El rol ${rolId} no tiene permisos para /netting`);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/netting/:path*",
  ],
};