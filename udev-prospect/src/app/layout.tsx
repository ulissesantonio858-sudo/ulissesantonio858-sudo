import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UDEV Prospect",
  description: "Prospeção B2B privada: encontrar, verificar e acompanhar potenciais clientes.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
