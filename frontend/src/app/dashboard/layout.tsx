// frontend/src/app/dashboard/layout.tsx
import React from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <React.Fragment>
      {/* El Sidebar y Header ya están renderizados globalmente en el RootLayout. 
          Aquí solo inyectamos el contenido hijo. */}
      {children}
    </React.Fragment>
  );
}