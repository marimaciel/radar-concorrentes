import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppChrome } from "@/components/AppChrome";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "900"] });

export const metadata: Metadata = {
  title: "Radar de Concorrentes",
  description: "Benchmarking automático — Clube Divos da IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
