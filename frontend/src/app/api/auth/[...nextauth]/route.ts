import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        const response = await fetch(`${apiUrl}/auth/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });

        if (response.ok) {
          return true;
        } else {
          console.warn(`🚨 Intento de acceso denegado para: ${user.email}`);
          return "/?error=AccesoDenegado"; 
        }
      } catch (error) {
        console.error("🚨 Error en signIn:", error);
        return false;
      }
    },
    
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
          const response = await fetch(`${apiUrl}/auth/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
          });

          if (response.ok) {
            const body = await response.json();
            
            if (body.success && body.data) {
              token.rol_id = body.data.rol_id;
              token.empresa_id = body.data.empresa_id;
              token.grupo_id = body.data.grupo_id;
              token.empresa_activa = body.data.empresa_activa; 
              token.holding_activo = body.data.holding_activo; 
              console.log("✅ Datos del backend inyectados en JWT");
            }
          }
        } catch (error) {
          console.error("🚨 Error comunicándose con el Backend desde NextAuth:", error);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.rol_id = token.rol_id as number;
        session.user.empresa_id = token.empresa_id as number;
        session.user.grupo_id = token.grupo_id as number;
        session.user.empresa_activa = token.empresa_activa as boolean; 
        session.user.holding_activo = token.holding_activo as boolean; 
      }
      return session;
    }
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };