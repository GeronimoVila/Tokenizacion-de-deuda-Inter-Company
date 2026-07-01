"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

function AuthSynchronizer({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { setAuth, logout } = useAuthStore();

  useEffect(() => {
    const fetchAndSyncProfile = async (email: string) => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        
        const res = await fetch(`${apiUrl}/auth/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        
        if (res.ok) {
          const result = await res.json();
          setAuth({
            email: result.data.email,
            rol_id: result.data.rol_id,
            empresa_id: result.data.empresa_id,
            grupo_id: result.data.grupo_id
          });
          console.log("✅ Perfil sincronizado en Zustand:", result.data.email);
        } else {
          logout();
        }
      } catch (error) {
        console.error("🚨 Error de red sincronizando perfil:", error);
        logout();
      }
    };

    if (status === "authenticated" && session?.user?.email) {
      fetchAndSyncProfile(session.user.email);
    } else if (status === "unauthenticated") {
      logout();
    }
  }, [status, session, setAuth, logout]);

  return <>{children}</>;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSynchronizer>{children}</AuthSynchronizer>
    </SessionProvider>
  );
}