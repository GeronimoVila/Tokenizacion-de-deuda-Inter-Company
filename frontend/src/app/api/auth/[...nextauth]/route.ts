import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt", // Clave: Usamos tokens en vez de base de datos directa
  },
  callbacks: {
    // Interceptamos el momento exacto donde Google nos aprueba el login
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        // Le avisamos a TU Backend Node.js que alguien entró (Ajustá el puerto 4000 si usás otro)
        const response = await fetch("http://localhost:4000/api/auth/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            image: user.image,
          }),
        });

        if (response.ok) {
          return true; // El backend lo guardó ok, lo dejamos entrar a la app
        } else {
          console.error("El backend rechazó el guardado del usuario");
          return false; 
        }
      } catch (error) {
        console.error("Error comunicándose con el Backend:", error);
        // Para que no te bloquees en desarrollo, devolvemos true, 
        // pero en producción acá deberíamos devolver false si el backend está caído.
        return true; 
      }
    },
  },
});

export { handler as GET, handler as POST };