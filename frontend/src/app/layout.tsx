// frontend/src/app/layout.tsx
import React from "react";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import "./globals.css";

// Tipado estricto
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className="antialiased font-sans text-gray-900 bg-gray-50">
        <AuthProvider>
          {/* El AppShell decide si dibuja o no los menús según la URL */}
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}