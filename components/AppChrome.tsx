"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") return <main className="login-page">{children}</main>;

  return (
    <>
      <TopBar />
      <Sidebar />
      <div className="shell">{children}</div>
    </>
  );
}