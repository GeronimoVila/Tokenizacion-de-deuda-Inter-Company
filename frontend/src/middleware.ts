import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const rolId = token.rol_id as number | undefined;
  
  const empresaActiva = token.empresa_activa as boolean | undefined;
  const holdingActivo = token.holding_activo as boolean | undefined;

  const entornoInactivo = (empresaActiva === false || holdingActivo === false);

  const accessRules = [
    { path: '/admin-core', roles: [1] },
    { path: '/cargar-deuda', roles: [3, 4] },
    { path: '/aprobaciones', roles: [3, 4] },
    { path: '/liquidar-deuda', roles: [3] },
    { path: '/netting', roles: [2] },
    { path: '/dashboard/configuracion/empresas', roles: [2] },
    { path: '/dashboard/configuracion/usuarios', roles: [2, 3] },
  ];

  const rule = accessRules.find((r) => pathname.startsWith(r.path));

  if (rule) {
    if (!rolId || !rule.roles.includes(rolId)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  const rutasOperativas = ['/cargar-deuda', '/aprobaciones', '/liquidar-deuda', '/netting'];
  const intentaAccederRutaOperativa = rutasOperativas.some(ruta => pathname.startsWith(ruta));

  if (intentaAccederRutaOperativa && entornoInactivo) {
    console.warn(`[Middleware] Acceso denegado: Intento de operar en ${pathname} con entorno inactivo.`);
    
    const dashboardUrl = new URL('/dashboard', req.url);
    dashboardUrl.searchParams.set('error', 'baja_logica');
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|$).*)',
  ],
};