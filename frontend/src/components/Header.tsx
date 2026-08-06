"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const getRoleName = (rolId?: number) => {
    if (!rolId) return "OPERADOR";
    if ([1, 2, 3].includes(rolId)) return "ADMINISTRADOR";
    if (rolId === 5) return "AUDITOR";
    return "OPERADOR";
  };

  const userRole = getRoleName(session?.user?.rol_id);
  const userName = session?.user?.name || "Usuario";
  
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-24 min-h-20 w-full items-center justify-between border-b bg-background/95 px-8 backdrop-blur supports-backdrop-filter:bg-background/60">
      
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
          TD
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground hidden sm:block">
          Tokenización de deuda
        </h2>
      </div>
      
      <div className="flex items-center">
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-14 w-auto flex items-center gap-3 rounded-full hover:bg-muted/50 px-3">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-base font-bold leading-none text-foreground">{userName}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1.5">
                  {userRole}
                </span>
              </div>
              <Avatar className="h-10 w-10 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary font-bold tracking-widest">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />

            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}