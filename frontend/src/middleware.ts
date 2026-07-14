import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    console.log("\n=== DEBUG MIDDLEWARE ===");
    console.log("Ruta solicitada:", path);
    console.log("Token completo extraído:", token);
    console.log("Rol ID en token:", token?.rol_id, "| Tipo:", typeof token?.rol_id);
    console.log("========================\n");

    if (!token) {
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }

    const rolId = Number(token.rol_id); 

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