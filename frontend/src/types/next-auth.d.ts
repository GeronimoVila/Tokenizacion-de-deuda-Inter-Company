import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  
  interface Session {
    user: {
      rol_id?: number;
      empresa_id?: number;
      grupo_id?: number;
      empresa_activa?: boolean;
      holding_activo?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    rol_id?: number;
    empresa_id?: number;
    grupo_id?: number;
    empresa_activa?: boolean;
    holding_activo?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol_id?: number;
    empresa_id?: number;
    grupo_id?: number;
    empresa_activa?: boolean;
    holding_activo?: boolean;
  }
}