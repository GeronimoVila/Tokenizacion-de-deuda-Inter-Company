import React from "react";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className="antialiased font-sans text-gray-900 bg-gray-50">
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}