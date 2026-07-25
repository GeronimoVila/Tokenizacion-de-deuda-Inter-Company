// frontend/src/middleware.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Obtenemos el token de sesión de Google Auth inyectado por NextAuth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // 1. Si no hay token de sesión, redirigimos inmediatamente a la página de login (/)
  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Extraemos el rol del usuario desde el JWT
  const rolId = token.rol_id as number | undefined;

  // 2. Definimos la matriz RBAC para el enrutamiento del Frontend
  // Nota: Al ejecutarse en el Edge, no podemos importar fácilmente archivos externos 
  // complejos, por lo que definimos las reglas de restricción críticas aquí.
  const accessRules = [
    { path: '/admin-core', roles: [1] },
    { path: '/cargar-deuda', roles: [3, 4] },
    { path: '/aprobaciones', roles: [3, 4] },
    { path: '/liquidar-deuda', roles: [3] },
    { path: '/netting', roles: [2] },
    { path: '/dashboard/configuracion/empresas', roles: [2] },
    { path: '/dashboard/configuracion/usuarios', roles: [2, 3] },
  ];

  // 3. Buscamos si la ruta actual coincide con alguna regla protegida
  const rule = accessRules.find((r) => pathname.startsWith(r.path));

  // 4. Validación de acceso (Type Guarding & RBAC)
  if (rule) {
    if (!rolId || !rule.roles.includes(rolId)) {
      // Si el rol no está en la lista de permitidos, lo expulsamos de regreso al Dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Si pasa todas las validaciones, permitimos que Next.js renderice la vista
  return NextResponse.next();
}

// 5. Configuración del Matcher: Le indica a Next.js qué rutas deben pasar por este filtro
export const config = {
  matcher: [
    /*
     * Intercepta todas las rutas excepto:
     * - api (rutas de API)
     * - _next/static (archivos estáticos)
     * - _next/image (imágenes optimizadas)
     * - favicon.ico (ícono del sitio)
     * - la ruta raíz (/) que es el login
     */
    '/((?!api|_next/static|_next/image|favicon.ico|$).*)',
  ],
};