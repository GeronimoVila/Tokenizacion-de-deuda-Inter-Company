import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      rol_id?: number;
      empresa_id?: number;
      grupo_id?: number;
    } & DefaultSession["user"];
  }

  interface User {
    rol_id?: number;
    empresa_id?: number;
    grupo_id?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol_id?: number;
    empresa_id?: number;
    grupo_id?: number;
  }
}